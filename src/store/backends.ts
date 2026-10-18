import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { emptyState, type Op, type ProjectStatus, type State } from '@/lib/types'
import { upgradeLocal } from '@/data/seed'

export interface Backend {
  kind: 'local' | 'cloud'
  load(): Promise<State>
  // Called after the reducer has applied op; `next` is the resulting state.
  save(op: Op, next: State): Promise<void>
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
      return raw ? upgradeLocal(JSON.parse(raw)) : emptyState()
    } catch {
      return emptyState()
    }
  },
  async save(_op, next) {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(next))
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

export function cloudBackend(db: SupabaseClient): Backend {
  return {
    kind: 'cloud',
    async load() {
      const [settings, days, plan, projects, cnotes, notes, ideas, ideaNotes, bookmarks, chapters, lists, listProgress, routines] = await Promise.all([
        rows(db.from('settings').select('*').maybeSingle()),
        rows(db.from('day_logs').select('*')),
        rows(db.from('plan_progress').select('*')),
        rows(db.from('project_status').select('*')),
        rows(db.from('chapter_notes').select('*')),
        rows(db.from('notes').select('*').order('created_at', { ascending: false })),
        rows(db.from('ideas').select('*').order('created_at', { ascending: false })),
        rows(db.from('idea_notes').select('*').order('created_at')),
        rows(db.from('bookmarks').select('*').order('created_at', { ascending: false })),
        rows(db.from('chapters').select('data')),
        rows(db.from('lists').select('data')),
        rows(db.from('list_progress').select('*')),
        rows(db.from('routines').select('data')),
      ])

      const s = emptyState()
      if (settings) {
        const { start_date, quit, gym_start, program } = settings
        s.settings = { start_date: start_date ?? undefined, quit, gym_start, program: program ?? undefined }
      }
      for (const d of (days ?? []) as Row[]) s.days[d.day] = { done: d.done, log: d.log, weight: d.weight, smoke: d.smoke }
      for (const p of (plan ?? []) as Row[]) s.plan[p.task_id] = p.done_at
      for (const p of (projects ?? []) as Row[]) s.projects[p.project_id] = p.status as ProjectStatus
      for (const c of (cnotes ?? []) as Row[]) s.chapterNotes[c.chapter] = c.body
      s.notes = (notes ?? []).map((n: Row) => ({ id: n.id, chapter: n.chapter, body: n.body, created_at: n.created_at }))
      s.ideas = (ideas ?? []).map((i: Row) => ({
        id: i.id, title: i.title, body: i.body, labels: i.labels, created_at: i.created_at,
        notes: (ideaNotes ?? []).filter((n: Row) => n.idea_id === i.id)
          .map((n: Row) => ({ id: n.id, idea_id: n.idea_id, body: n.body, created_at: n.created_at })),
      }))
      s.bookmarks = (bookmarks ?? []).map((b: Row) => ({
        id: b.id, url: b.url, kind: b.kind, title: b.title, description: b.description, tags: b.tags, note: b.note, chapter: b.chapter ?? null, source: b.source, created_at: b.created_at,
      }))
      s.chapters = (chapters ?? []).map((r: Row) => r.data)
      s.lists = (lists ?? []).map((r: Row) => r.data)
      s.routines = (routines ?? []).map((r: Row) => r.data)
      for (const p of (listProgress ?? []) as Row[]) (s.listProgress[p.list_id] ??= {})[p.item_id] = { done_at: p.done_at, note: p.note }
      return s
    },

    async save(op, next) {
      switch (op.type) {
        case 'settings': {
          const { start_date, quit, gym_start, program } = next.settings
          check(await db.from('settings').upsert({
            start_date: start_date ?? null, quit: quit ?? null, gym_start: gym_start ?? null, program: program ?? null, updated_at: new Date().toISOString(),
          }))
          return
        }
        case 'day':
          check(await db.from('day_logs').upsert({ day: op.day, done: op.log.done, log: op.log.log ?? null, weight: op.log.weight ?? null, smoke: op.log.smoke ?? null }))
          return
        case 'plan':
          if (op.doneAt) check(await db.from('plan_progress').upsert({ task_id: op.taskId, done_at: op.doneAt }))
          else check(await db.from('plan_progress').delete().eq('task_id', op.taskId))
          return
        case 'project':
          check(await db.from('project_status').upsert({ project_id: op.projectId, status: op.status }))
          return
        case 'chapterNote':
          check(await db.from('chapter_notes').upsert({ chapter: op.chapter, body: op.body, updated_at: new Date().toISOString() }))
          return
        case 'addNote':
          check(await db.from('notes').insert(op.note))
          return
        case 'deleteNote':
          check(await db.from('notes').delete().eq('id', op.id))
          return
        case 'addIdea': {
          const { notes: _notes, ...idea } = op.idea
          check(await db.from('ideas').insert(idea))
          return
        }
        case 'deleteIdea':
          check(await db.from('ideas').delete().eq('id', op.id))
          return
        case 'addIdeaNote':
          check(await db.from('idea_notes').insert(op.note))
          return
        case 'listItem':
          if (op.progress.done_at || op.progress.note)
            check(await db.from('list_progress').upsert({ list_id: op.list, item_id: op.item, done_at: op.progress.done_at ?? null, note: op.progress.note ?? null }))
          else check(await db.from('list_progress').delete().eq('list_id', op.list).eq('item_id', op.item))
          return
        case 'addBookmark':
          check(await db.from('bookmarks').upsert(op.bookmark, { onConflict: 'user_id,url' }))
          return
        case 'deleteBookmark':
          check(await db.from('bookmarks').delete().eq('id', op.id))
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
        case 'batch':
          for (const o of op.ops) await this.save(o, next)
          return
      }
    },
  }
}

// Copies everything saved on this device into the signed-in account.
export async function importLocal(db: SupabaseClient, s: State) {
  const be = cloudBackend(db)
  const ops: Op[] = [{ type: 'settings', patch: s.settings }]
  for (const [day, log] of Object.entries(s.days)) ops.push({ type: 'day', day, log })
  for (const [taskId, doneAt] of Object.entries(s.plan)) ops.push({ type: 'plan', taskId, doneAt })
  for (const [projectId, status] of Object.entries(s.projects)) ops.push({ type: 'project', projectId, status })
  for (const [chapter, body] of Object.entries(s.chapterNotes)) ops.push({ type: 'chapterNote', chapter, body })
  for (const note of s.notes) ops.push({ type: 'addNote', note })
  for (const idea of s.ideas) {
    ops.push({ type: 'addIdea', idea })
    for (const note of idea.notes) ops.push({ type: 'addIdeaNote', note })
  }
  for (const [list, items] of Object.entries(s.listProgress))
    for (const [item, progress] of Object.entries(items)) ops.push({ type: 'listItem', list, item, progress })
  for (const bookmark of s.bookmarks) ops.push({ type: 'addBookmark', bookmark })
  for (const chapter of s.chapters) ops.push({ type: 'putChapter', chapter })
  for (const list of s.lists) ops.push({ type: 'putList', list })
  for (const routine of s.routines) ops.push({ type: 'putRoutine', routine })
  for (const op of ops) await be.save(op, s)
}
