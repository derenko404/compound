import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { emptyState, type ChapterId, type Note, type Op, type ProjectStatus, type State } from '@/lib/types'
import { normalizeState } from '@/lib/content'

// What the Notebook asks for. q may hold #tags (matched exactly) and words (matched in the text, AI context and link).
export interface NotesFilter { chapter?: ChapterId | null; links?: boolean; q?: string }

export interface Backend {
  kind: 'local' | 'cloud'
  load(): Promise<State>
  // Called after the reducer has applied op; `next` is the resulting state.
  save(op: Op, next: State): Promise<void>
  // Notes are read a page at a time, newest first, instead of with the rest of the state.
  notes(f: NotesFilter, offset: number, limit: number): Promise<Note[]>
  // How many notes match, without loading them (tab counts).
  countNotes(f: NotesFilter): Promise<number>
}

const parseQuery = (q = '') => {
  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean)
  return { tags: words.filter((w) => w.startsWith('#') && w.length > 1).map((w) => w.slice(1)), text: words.filter((w) => !w.startsWith('#')) }
}

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null

/* ---------- Local: the whole state as one JSON blob in localStorage ---------- */

const LOCAL_KEY = 'roadmap-log-v2'

export const localBackend: Backend = {
  kind: 'local',
  async load() {
    try {
      const raw = localStorage.getItem(LOCAL_KEY)
      return raw ? { ...emptyState(), ...JSON.parse(raw) } : emptyState()
    } catch {
      return emptyState()
    }
  },
  async save(_op, next) {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(next))
  },
  async notes(f, offset, limit) {
    const { tags, text } = parseQuery(f.q)
    const all = normalizeState(await this.load()).notes
    return all
      .filter((n) => (!f.chapter || n.chapter === f.chapter) && (!f.links || !!n.url) && tags.every((t) => n.tags.includes(t))
        && text.every((w) => [n.body, n.context, n.url ?? ''].join(' ').toLowerCase().includes(w)))
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(offset, offset + limit)
  },
  async countNotes(f) {
    return (await this.notes(f, 0, Infinity)).length
  },
}

export const loadLocalSnapshot = () => localBackend.load()
export const clearLocalSnapshot = () => localStorage.removeItem(LOCAL_KEY)

/* ---------- Cloud: one Supabase table per kind of data, private via RLS ---------- */

const check = <T extends { error: unknown }>(r: T) => {
  if (r.error) throw r.error
  return r
}

// Rows come back untyped (no generated DB types); the mapping below gives them shape.
// oxlint-disable-next-line no-explicit-any
type Row = any
const rows = async (p: PromiseLike<{ data: Row; error: unknown }>): Promise<Row> => check(await p).data

// The Notebook's filters as a Supabase query.
// oxlint-disable-next-line no-explicit-any
function filterNotes(q: any, f: NotesFilter) {
  const { tags, text } = parseQuery(f.q)
  if (f.chapter) q = q.eq('chapter', f.chapter)
  if (f.links) q = q.not('url', 'is', null)
  if (tags.length) q = q.contains('tags', tags)
  // PostgREST's or() takes a comma list, so commas and brackets are dropped from search words.
  for (const w of text.map((x) => x.replace(/[,()%*]/g, '')).filter(Boolean))
    q = q.or(`body.ilike.%${w}%,context.ilike.%${w}%,url.ilike.%${w}%`)
  return q
}

export function cloudBackend(db: SupabaseClient): Backend {
  return {
    kind: 'cloud',
    async load() {
      const [settings, days, plan, projects, chapters, lists, listProgress, routines, habits, habitLogs] = await Promise.all([
        rows(db.from('settings').select('*').maybeSingle()),
        rows(db.from('day_logs').select('*')),
        rows(db.from('plan_progress').select('*')),
        rows(db.from('project_status').select('*')),
        rows(db.from('chapters').select('data')),
        rows(db.from('lists').select('data')),
        rows(db.from('list_progress').select('*')),
        rows(db.from('routines').select('data')),
        rows(db.from('habits').select('id, type, name, why, start_date, days, position, custom_data, created_at')),
        rows(db.from('habit_logs').select('habit_id, day, value')),
      ])

      const s = emptyState()
      if (settings) {
        s.settings = { program: settings.program ?? undefined }
      }
      for (const d of (days ?? []) as Row[]) s.days[d.day] = { done: d.done, mood: d.mood }
      for (const p of (plan ?? []) as Row[]) s.plan[p.task_id] = p.done_at
      for (const p of (projects ?? []) as Row[]) s.projects[p.project_id] = p.status as ProjectStatus
      s.chapters = (chapters ?? []).map((r: Row) => r.data)
      s.lists = (lists ?? []).map((r: Row) => r.data)
      s.routines = (routines ?? []).map((r: Row) => r.data)
      s.habits = habits ?? []
      for (const l of (habitLogs ?? []) as Row[]) (s.habitLogs[l.habit_id] ??= {})[l.day] = l.value
      for (const p of (listProgress ?? []) as Row[]) (s.listProgress[p.list_id] ??= {})[p.item_id] = { done_at: p.done_at, note: p.note }
      return s
    },

    async countNotes(f) {
      const r = check(await filterNotes(db.from('notes').select('id', { count: 'exact', head: true }), f))
      return r.count ?? 0
    },

    async notes(f, offset, limit) {
      const q = filterNotes(db.from('notes').select('*'), f).order('created_at', { ascending: false }).range(offset, offset + limit - 1)
      return ((await rows(q)) ?? []).map((n: Row): Note => ({
        id: n.id, type: n.type, body: n.body, url: n.url, kind: n.kind, context: n.context, tags: n.tags,
        chapter: n.chapter, source: n.source, created_at: n.created_at,
      }))
    },

    async save(op, next) {
      switch (op.type) {
        case 'settings': {
          check(await db.from('settings').upsert({ program: next.settings.program ?? null, updated_at: new Date().toISOString() }))
          return
        }
        case 'day':
          check(await db.from('day_logs').upsert({ day: op.day, done: op.log.done, mood: op.log.mood ?? null }))
          return
        case 'plan':
          if (op.doneAt) check(await db.from('plan_progress').upsert({ task_id: op.taskId, done_at: op.doneAt }))
          else check(await db.from('plan_progress').delete().eq('task_id', op.taskId))
          return
        case 'project':
          check(await db.from('project_status').upsert({ project_id: op.projectId, status: op.status }))
          return
        case 'putNote':
          check(await db.from('notes').upsert(op.note))
          return
        case 'deleteNote':
          check(await db.from('notes').delete().eq('id', op.id))
          return
        case 'listItem':
          if (op.progress.done_at || op.progress.note)
            check(await db.from('list_progress').upsert({ list_id: op.list, item_id: op.item, done_at: op.progress.done_at ?? null, note: op.progress.note ?? null }))
          else check(await db.from('list_progress').delete().eq('list_id', op.list).eq('item_id', op.item))
          return
        case 'putChapter':
          check(await db.from('chapters').upsert({ id: op.chapter.id, data: op.chapter, updated_at: new Date().toISOString() }))
          return
        case 'deleteChapter':
          check(await db.from('chapters').delete().eq('id', op.id))
          return
        case 'putList':
          check(await db.from('lists').upsert({ id: op.list.id, data: op.list, updated_at: new Date().toISOString() }))
          return
        case 'deleteList':
          check(await db.from('list_progress').delete().eq('list_id', op.id))
          check(await db.from('lists').delete().eq('id', op.id))
          return
        case 'putRoutine':
          check(await db.from('routines').upsert({ id: op.routine.id, data: op.routine, updated_at: new Date().toISOString() }))
          return
        case 'deleteRoutine':
          check(await db.from('routines').delete().eq('id', op.id))
          return
        case 'putHabit':
          check(await db.from('habits').upsert({ ...op.habit, updated_at: new Date().toISOString() }))
          return
        case 'deleteHabit':
          check(await db.from('habits').delete().eq('id', op.id))
          return
        case 'habitLog':
          if (op.value == null) check(await db.from('habit_logs').delete().eq('habit_id', op.habit).eq('day', op.day))
          else check(await db.from('habit_logs').upsert({ habit_id: op.habit, day: op.day, value: op.value }))
          return
        case 'batch':
          for (const o of op.ops) await this.save(o, next)
          return
      }
    },
  }
}

/* ---------- Export and import a file ---------- */

// Everything as one JSON file: the loaded state plus every note (notes are paged, so they're fetched here).
export async function exportAll(backend: Backend, s: State) {
  const notes: Note[] = []
  while (true) {
    const page = await backend.notes({}, notes.length, 500)
    notes.push(...page)
    if (page.length < 500) break
  }
  return { app: 'roadmap-log', exported_at: new Date().toISOString(), state: { ...s, notes } }
}

// Reads a file made by exportAll; the state is merged over the current one, item by item.
export function parseExport(text: string): State {
  const j = JSON.parse(text)
  const s = j?.app === 'roadmap-log' ? j.state : j
  if (!s || typeof s !== 'object' || !('days' in s)) throw new Error('Not a Roadmap Log export')
  return normalizeState({ ...emptyState(), ...s })
}

// Writes an imported file into the active backend: the account (one save per item) or this device.
export async function importFile(backend: Backend, current: State, file: State) {
  if (backend.kind === 'cloud') return importLocal(supabase!, file)
  const byId = <T extends { id: string }>(a: T[], b: T[]) => [...a.filter((x) => !b.some((y) => y.id === x.id)), ...b]
  const merged: State = {
    ...current,
    settings: { ...current.settings, ...file.settings },
    days: { ...current.days, ...file.days },
    plan: { ...current.plan, ...file.plan },
    projects: { ...current.projects, ...file.projects },
    listProgress: { ...current.listProgress, ...file.listProgress },
    habitLogs: { ...current.habitLogs, ...file.habitLogs },
    notes: byId(current.notes, file.notes),
    chapters: byId(current.chapters, file.chapters),
    lists: byId(current.lists, file.lists),
    routines: byId(current.routines, file.routines),
    habits: byId(current.habits, file.habits),
  }
  localStorage.setItem(LOCAL_KEY, JSON.stringify(merged))
}

/* ---------- Telegram: link one chat to the account ---------- */

export interface TelegramLink { chat_id: number; username: string | null }

export async function telegramLink(db: SupabaseClient): Promise<TelegramLink | null> {
  return (await rows(db.from('telegram_links').select('chat_id, username').maybeSingle())) ?? null
}

// A one-time code for t.me/<bot>?start=<code>; the bot checks it and saves the link.
export async function telegramCode(db: SupabaseClient) {
  const bytes = crypto.getRandomValues(new Uint8Array(18))
  const code = btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  check(await db.from('telegram_codes').insert({ code }))
  return code
}

export async function disconnectTelegram(db: SupabaseClient) {
  // RLS keeps this to the signed-in account's row; the filter only satisfies "no delete without a filter".
  check(await db.from('telegram_links').delete().not('chat_id', 'is', null))
}

// Copies everything saved on this device into the signed-in account.
export async function importLocal(db: SupabaseClient, s: State) {
  const be = cloudBackend(db)
  const ops: Op[] = [{ type: 'settings', patch: s.settings }]
  for (const [day, log] of Object.entries(s.days)) ops.push({ type: 'day', day, log })
  for (const [taskId, doneAt] of Object.entries(s.plan)) ops.push({ type: 'plan', taskId, doneAt })
  for (const [projectId, status] of Object.entries(s.projects)) ops.push({ type: 'project', projectId, status })
  for (const note of s.notes) ops.push({ type: 'putNote', note })
  for (const [list, items] of Object.entries(s.listProgress))
    for (const [item, progress] of Object.entries(items)) ops.push({ type: 'listItem', list, item, progress })
  for (const chapter of s.chapters) ops.push({ type: 'putChapter', chapter })
  for (const list of s.lists) ops.push({ type: 'putList', list })
  for (const routine of s.routines) ops.push({ type: 'putRoutine', routine })
  for (const habit of s.habits) ops.push({ type: 'putHabit', habit })
  for (const [habit, log] of Object.entries(s.habitLogs))
    for (const [day, value] of Object.entries(log)) ops.push({ type: 'habitLog', habit, day, value })
  for (const op of ops) await be.save(op, s)
}
