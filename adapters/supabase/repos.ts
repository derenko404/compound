// The storage ports over Supabase, one table per kind of data. Two ways in:
// - the app's signed-in client: row-level security keeps every query to the user's own rows, and user_id defaults
//   to auth.uid() in the database;
// - the worker's service-key client, which bypasses RLS: pass `userId` and every read filters on it and every
//   write sets it.
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Habit, ListDef, Note, Routine, Topic } from '../../core/domain/types'
import { parseNoteQuery } from '../../core/domain/notes'
import type { Collection, NotesFilter, Repos } from '../../core/ports/repos'

// Rows come back untyped (no generated DB types); each repo gives them shape.
// oxlint-disable-next-line no-explicit-any
type Row = any
// oxlint-disable-next-line no-explicit-any
type Query = any

const check = <T extends { error: unknown }>(r: T) => {
  if (r.error) throw r.error
  return r
}
const rows = async (p: PromiseLike<{ data: Row; error: unknown }>): Promise<Row> => check(await p).data ?? []
const now = () => new Date().toISOString()

export function supabaseRepos(db: SupabaseClient, userId?: string): Repos {
  // Scopes a query to the user (worker), or leaves it to RLS (app).
  const own = (q: Query): Query => (userId ? q.eq('user_id', userId) : q)
  const mine = <T extends object>(row: T) => (userId ? { ...row, user_id: userId } : row)
  const from = (table: string) => db.from(table)

  // Topics, lists and routines keep each row as JSON in `data`, ordered by the position inside it.
  const json = <T extends { id: string; position: number }>(table: string, onRemove?: (id: string) => Promise<void>): Collection<T> => ({
    async all() {
      return ((await rows(own(from(table).select('data')))) as { data: T }[]).map((r) => r.data).sort((a, b) => a.position - b.position)
    },
    async put(item) {
      check(await from(table).upsert(mine({ id: item.id, data: item, updated_at: now() })))
    },
    async remove(id) {
      await onRemove?.(id)
      check(await own(from(table).delete().eq('id', id)))
    },
  })

  // The Notebook's filters as a Supabase query.
  const filterNotes = (q: Query, f: NotesFilter) => {
    const { tags, text } = parseNoteQuery(f.q)
    if (f.topic) q = q.eq('topic', f.topic)
    if (tags.length) q = q.contains('tags', tags)
    // PostgREST's or() takes a comma list, so commas and brackets are dropped from search words.
    for (const w of text.map((x) => x.replace(/[,()%*]/g, '')).filter(Boolean))
      q = q.or(`body.ilike.%${w}%,context.ilike.%${w}%,url.ilike.%${w}%`)
    return q
  }

  return {
    topics: json<Topic>('topics'),
    lists: json<ListDef>('lists', async (id) => { check(await own(from('list_progress').delete().eq('list_id', id))) }),
    routines: json<Routine>('routines'),

    habits: {
      async all() {
        return (await rows(own(from('habits').select('id, type, name, why, start_date, days, position, custom_data, created_at')))) as Habit[]
      },
      async put(h) {
        check(await from('habits').upsert(mine({ ...h, updated_at: now() })))
      },
      async remove(id) {
        check(await own(from('habits').delete().eq('id', id)))
      },
    },

    habitLogs: {
      async all() {
        const out: Record<string, Record<string, number>> = {}
        for (const l of await rows(own(from('habit_logs').select('habit_id, day, value')))) (out[l.habit_id] ??= {})[l.day] = l.value
        return out
      },
      async set(habitId, day, value) {
        if (value == null) check(await own(from('habit_logs').delete().eq('habit_id', habitId).eq('day', day)))
        else check(await from('habit_logs').upsert(mine({ habit_id: habitId, day, value })))
      },
    },

    listProgress: {
      async all() {
        const out: Record<string, Record<string, { done_at?: string | null; note?: string | null }>> = {}
        for (const p of await rows(own(from('list_progress').select('*')))) (out[p.list_id] ??= {})[p.item_id] = { done_at: p.done_at, note: p.note }
        return out
      },
      async set(listId, itemId, p) {
        if (p.done_at || p.note) check(await from('list_progress').upsert(mine({ list_id: listId, item_id: itemId, done_at: p.done_at ?? null, note: p.note ?? null })))
        else check(await own(from('list_progress').delete().eq('list_id', listId).eq('item_id', itemId)))
      },
    },

    days: {
      async all() {
        const out: Record<string, { done: string[]; mood?: number | null }> = {}
        for (const d of await rows(own(from('day_logs').select('*')))) out[d.day] = { done: d.done, mood: d.mood }
        return out
      },
      async put(day, log) {
        check(await from('day_logs').upsert(mine({ day, done: log.done, mood: log.mood ?? null })))
      },
    },

    ticks: {
      async all() {
        const out: Record<string, string> = {}
        for (const p of await rows(own(from('plan_progress').select('*')))) out[p.task_id] = p.done_at
        return out
      },
      async set(itemId, doneAt) {
        if (doneAt) check(await from('plan_progress').upsert(mine({ task_id: itemId, done_at: doneAt })))
        else check(await own(from('plan_progress').delete().eq('task_id', itemId)))
      },
    },

    projects: {
      async all() {
        const out: Record<string, 'todo' | 'doing' | 'done'> = {}
        for (const p of await rows(own(from('project_status').select('*')))) out[p.project_id] = p.status
        return out
      },
      async set(projectId, status) {
        check(await from('project_status').upsert(mine({ project_id: projectId, status })))
      },
    },

    settings: {
      async program() {
        const s = check(await own(from('settings').select('*')).maybeSingle()).data as Row
        return s?.program ?? undefined
      },
      async setProgram(program) {
        check(await from('settings').upsert(mine({ program: program ?? null, updated_at: now() })))
      },
    },

    notes: {
      async page(f, offset, limit) {
        const q = filterNotes(own(from('notes').select('*')), f).order('created_at', { ascending: false }).range(offset, offset + limit - 1)
        return ((await rows(q)) as Row[]).map((n): Note => ({
          id: n.id, type: n.type, body: n.body, url: n.url, kind: n.kind, context: n.context, tags: n.tags,
          topic: n.topic, source: n.source, created_at: n.created_at,
        }))
      },
      async count(f) {
        return check(await filterNotes(own(from('notes').select('id', { count: 'exact', head: true })), f)).count ?? 0
      },
      async put(note) {
        check(await from('notes').upsert(mine(note)))
      },
      async remove(id) {
        check(await own(from('notes').delete().eq('id', id)))
      },
    },
  }
}
