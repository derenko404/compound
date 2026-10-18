// AI access: one set of operations behind the REST API (/api/v1) and the MCP server (/mcp).
// Every call runs as the user who owns the token. The worker's Supabase client uses the secret key (bypasses RLS),
// so every query here filters on user_id itself.
import type { SupabaseClient } from '@supabase/supabase-js'
import { PALETTE, PROJECT_SIZES, RESOURCE_KINDS, codePrefix, freshId, nextPosition, normalizeTopic } from '../src/lib/content'
import { cleanTag, findUrls, kindFromUrl } from '../src/lib/finds'
import type { Topic, ListDef, Project, Resource, ResourceKind, Routine, Skill, When } from '../src/lib/types'

export interface Caller { db: SupabaseClient; user: string }

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

const fail = (status: number, message: string): never => { throw new ApiError(status, message) }
const uuid = () => crypto.randomUUID()
const now = () => new Date().toISOString()
// oxlint-disable-next-line no-explicit-any
type Json = any

const check = <T extends { error: { message: string } | null }>(r: T) => {
  if (r.error) fail(500, r.error.message)
  return r
}

/* ---------- Tokens ---------- */

export async function sha256(text: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

// The token's owner, or null. Marks the token as used.
export async function userForToken(db: SupabaseClient, token: string) {
  if (!token) return null
  const { data } = await db.from('api_tokens').select('id, user_id').eq('token_hash', await sha256(token)).maybeSingle()
  if (!data) return null
  await db.from('api_tokens').update({ last_used_at: now() }).eq('id', data.id)
  return data.user_id as string
}

/* ---------- Reading the user's data ---------- */

async function topics(c: Caller): Promise<Topic[]> {
  const { data } = check(await c.db.from('topics').select('data').eq('user_id', c.user))
  return ((data ?? []) as { data: Topic }[]).map((r) => normalizeTopic(r.data)).sort((a, b) => a.position - b.position)
}

async function ticks(c: Caller): Promise<Set<string>> {
  const { data } = check(await c.db.from('plan_progress').select('task_id').eq('user_id', c.user))
  return new Set(((data ?? []) as { task_id: string }[]).map((r) => r.task_id))
}

async function lists(c: Caller): Promise<ListDef[]> {
  const { data } = check(await c.db.from('lists').select('data').eq('user_id', c.user))
  return ((data ?? []) as { data: ListDef }[]).map((r) => r.data).sort((a, b) => a.position - b.position)
}

const putTopic = async (c: Caller, t: Topic) =>
  check(await c.db.from('topics').upsert({ user_id: c.user, id: t.id, data: t, updated_at: now() }, { onConflict: 'user_id,id' }))
const putList = async (c: Caller, l: ListDef) =>
  check(await c.db.from('lists').upsert({ user_id: c.user, id: l.id, data: l, updated_at: now() }, { onConflict: 'user_id,id' }))

/* ---------- Input: the shapes an AI sends ---------- */

const str = (x: unknown, max = 2000) => (typeof x === 'string' ? x.trim().slice(0, max) : '')
const strs = (x: unknown) => (Array.isArray(x) ? x.map((v) => str(v, 400)).filter(Boolean) : [])
const arr = (x: unknown): Json[] => (Array.isArray(x) ? x.filter((v) => v && typeof v === 'object') : [])
// The API never deletes: a list sent in an update adds and changes items (matched by id, or by text for goals),
// and the items it leaves out stay, after the ones sent. Sending items in a new order reorders them.
const keep = <T extends { id: string }>(sent: T[], old: T[]) => [...sent, ...old.filter((o) => !sent.some((s) => s.id === o.id))]
const keepText = (sent: string[], old: string[]) => [...sent, ...old.filter((o) => !sent.includes(o))]

// Steps may come as plain text or as { id, text }. Keeping an id keeps its tick.
const skillsIn = (x: unknown): Skill[] => arr(x).map((k) => ({
  id: str(k.id, 80) || uuid(),
  name: str(k.name, 200) || fail(400, 'Every skill needs a name.'),
  intro: str(k.intro) || undefined,
  steps: (Array.isArray(k.steps) ? k.steps : []).map((t: Json) => (typeof t === 'string' ? { id: uuid(), text: str(t, 400) } : { id: str(t?.id, 80) || uuid(), text: str(t?.text, 400) }))
    .filter((t: { text: string }) => t.text),
}))

const kinds = new Set<string>(RESOURCE_KINDS.map((k) => k.id))
const resourcesIn = (x: unknown): Resource[] => arr(x).map((r) => {
  const url = str(r.url, 1000) || undefined
  return {
    id: str(r.id, 80) || uuid(),
    title: str(r.title, 300) || fail(400, 'Every resource needs a title.'),
    url,
    kind: (kinds.has(r.kind) ? r.kind : 'other') as ResourceKind,
    note: str(r.note) || undefined,
    free: typeof r.free === 'boolean' ? r.free : undefined,
  }
})

const sizes = new Set<string>(PROJECT_SIZES.map((s) => s.value))
// Codes (TE1, TE2…) are given here, from the topic's name, continuing after the codes it already has.
function projectsIn(x: unknown, topic: Topic, all: Topic[]): Project[] {
  const prefix = codePrefix(topic, all)
  let n = 0
  return arr(x).map((p) => ({
    id: str(p.id, 80) || uuid(),
    code: str(p.code, 12) || `${prefix}${++n}`,
    name: str(p.name, 300) || fail(400, 'Every project needs a name.'),
    goal: str(p.goal) || undefined,
    steps: strs(p.steps).length ? strs(p.steps) : undefined,
    done: str(p.done) || undefined,
    trains: strs(p.trains).length ? strs(p.trains) : undefined,
    size: sizes.has(p.size) ? p.size : undefined,
  }))
}

const freeColor = (all: Topic[]) => PALETTE.find((p) => !all.some((c) => c.color === p)) ?? PALETTE[all.length % PALETTE.length]

/* ---------- Output: what an AI reads back ---------- */

const topicOut = (t: Topic, done: Set<string>) => ({
  id: t.id, name: t.name, kind: t.kind, color: t.color, description: t.description ?? '', goals: t.outcomes, months: t.months ?? null,
  skills: t.skills.map((k) => ({ id: k.id, name: k.name, intro: k.intro ?? '', steps: k.steps.map((x) => ({ id: x.id, text: x.text, done: done.has(x.id) })) })),
  resources: t.resources.map((r) => ({ ...r, done: done.has(r.id) })),
  projects: t.projects,
})

const topicSummary = (t: Topic, done: Set<string>) => {
  const steps = t.skills.flatMap((k) => k.steps)
  return { id: t.id, name: t.name, kind: t.kind, skills: t.skills.length, steps: steps.length, steps_done: steps.filter((x) => done.has(x.id)).length, resources: t.resources.length, projects: t.projects.length }
}

/* ---------- Operations ---------- */

const findTopic = (all: Topic[], id: unknown) => all.find((t) => t.id === id) ?? fail(404, `No topic with id "${String(id)}".`)

export const ops = {
  async list_topics(c: Caller) {
    const [all, done] = await Promise.all([topics(c), ticks(c)])
    return all.map((t) => topicSummary(t, done))
  },

  async get_topic(c: Caller, a: Json) {
    const [all, done] = await Promise.all([topics(c), ticks(c)])
    return topicOut(findTopic(all, a.id), done)
  },

  async create_topic(c: Caller, a: Json) {
    const all = await topics(c)
    const name = str(a.name, 60) || fail(400, 'A topic needs a name.')
    const t: Topic = {
      id: freshId(name, all.map((x) => x.id)), kind: 'learn', position: nextPosition(all), name,
      color: (PALETTE as readonly string[]).includes(a.color) ? a.color : freeColor(all),
      description: str(a.description, 6000) || undefined, outcomes: strs(a.goals),
      months: Number.isInteger(a.months) && a.months > 0 ? a.months : undefined, created_at: now(),
      skills: skillsIn(a.skills), resources: resourcesIn(a.resources), projects: [], hint: str(a.hint, 200) || undefined,
    }
    t.projects = projectsIn(a.projects, t, [...all, t])
    await putTopic(c, t)
    return topicOut(t, new Set())
  },

  // Only the fields given change. Lists given (skills, resources, projects, goals, a skill's steps) add and
  // change items but never drop them: anything not sent back stays, after the items sent (see keep).
  async update_topic(c: Caller, a: Json) {
    const all = await topics(c)
    const t = { ...findTopic(all, a.id) }
    if (a.name !== undefined) t.name = str(a.name, 60) || fail(400, 'A topic needs a name.')
    if (a.description !== undefined) t.description = str(a.description, 6000) || undefined
    if (a.goals !== undefined) t.outcomes = keepText(strs(a.goals), t.outcomes)
    if (a.months !== undefined) t.months = Number.isInteger(a.months) && a.months > 0 ? a.months : undefined
    if (a.color !== undefined && (PALETTE as readonly string[]).includes(a.color)) t.color = a.color
    if (a.skills !== undefined) {
      // A skill sent back keeps the steps it didn't mention, like the lists around it.
      const sent = skillsIn(a.skills).map((k) => {
        const old = t.skills.find((o) => o.id === k.id)
        return old ? { ...k, steps: keep(k.steps, old.steps) } : k
      })
      t.skills = keep(sent, t.skills)
    }
    if (a.resources !== undefined) t.resources = keep(resourcesIn(a.resources), t.resources)
    if (a.projects !== undefined) t.projects = keep(projectsIn(a.projects, t, all), t.projects)
    await putTopic(c, t)
    return topicOut(t, await ticks(c))
  },

  async list_lists(c: Caller) {
    const [all, progress] = await Promise.all([lists(c), c.db.from('list_progress').select('list_id, done_at').eq('user_id', c.user)])
    const done = ((progress.data ?? []) as { list_id: string; done_at: string | null }[]).filter((p) => p.done_at)
    return all.map((l) => ({ id: l.id, name: l.name, title: l.title, items: l.items.length, done: done.filter((p) => p.list_id === l.id).length }))
  },

  async get_list(c: Caller, a: Json) {
    const l = (await lists(c)).find((x) => x.id === a.id) ?? fail(404, `No list with id "${String(a.id)}".`)
    const { data } = check(await c.db.from('list_progress').select('item_id, done_at, note').eq('user_id', c.user).eq('list_id', l.id))
    const p = new Map(((data ?? []) as { item_id: string; done_at: string | null; note: string | null }[]).map((r) => [r.item_id, r]))
    return { id: l.id, name: l.name, title: l.title, detail_label: l.sub_label, items: l.items.map((it) => ({ id: it.id, title: it.title, detail: it.sub ?? '', done: !!p.get(it.id)?.done_at, note: p.get(it.id)?.note ?? '' })) }
  },

  async create_list(c: Caller, a: Json) {
    const all = await lists(c)
    const name = str(a.name, 60) || fail(400, 'A list needs a name.')
    const l: ListDef = {
      id: freshId(name, all.map((x) => x.id)), position: nextPosition(all), name,
      title: str(a.title, 200) || name, sub_label: str(a.detail_label, 40),
      items: arr(a.items).map((it, i) => ({ id: str(it.id, 80) || String(i), title: str(it.title, 300), sub: str(it.detail, 200) || undefined })).filter((it) => it.title),
    }
    await putList(c, l)
    return ops.get_list(c, { id: l.id })
  },

  // Items given are added or changed; items not sent back stay (see keep), with their ticks and notes.
  async update_list(c: Caller, a: Json) {
    const l = { ...((await lists(c)).find((x) => x.id === a.id) ?? fail(404, `No list with id "${String(a.id)}".`)) }
    if (a.name !== undefined) l.name = str(a.name, 60) || fail(400, 'A list needs a name.')
    if (a.title !== undefined) l.title = str(a.title, 200) || l.name
    if (a.detail_label !== undefined) l.sub_label = str(a.detail_label, 40)
    if (a.items !== undefined) l.items = keep(arr(a.items).map((it) => ({ id: str(it.id, 80) || uuid(), title: str(it.title, 300), sub: str(it.detail, 200) || undefined })).filter((it) => it.title), l.items)
    await putList(c, l)
    return ops.get_list(c, { id: l.id })
  },

  async list_routines(c: Caller) {
    const { data } = check(await c.db.from('routines').select('data').eq('user_id', c.user))
    return ((data ?? []) as { data: Routine }[]).map((r) => r.data).sort((x, y) => x.position - y.position)
  },

  async add_routine(c: Caller, a: Json) {
    const routines = await ops.list_routines(c)
    const all = await topics(c)
    const r: Routine = {
      id: uuid(), position: nextPosition(routines), title: str(a.title, 200) || fail(400, 'A routine needs a title.'),
      sub: str(a.details, 400) || undefined, topic: all.some((t) => t.id === a.topic) ? a.topic : 'own',
      when: whenIn(a.when), core: a.counts_for_streak !== false, created_at: now(),
    }
    check(await c.db.from('routines').upsert({ user_id: c.user, id: r.id, data: r, updated_at: now() }, { onConflict: 'user_id,id' }))
    return r
  },


  async list_notes(c: Caller, a: Json) {
    let q = c.db.from('notes').select('id, type, body, url, context, tags, topic, created_at').eq('user_id', c.user)
    if (a.topic) q = q.eq('topic', a.topic)
    for (const w of str(a.query, 200).split(/\s+/).filter(Boolean).map((x) => x.replace(/[,()%*]/g, '')))
      q = q.or(`body.ilike.%${w}%,context.ilike.%${w}%,url.ilike.%${w}%`)
    const { data } = check(await q.order('created_at', { ascending: false }).limit(Math.min(Number(a.limit) || 20, 100)))
    return data ?? []
  },

  async add_note(c: Caller, a: Json) {
    const body = str(a.text, 8000)
    const url = str(a.url, 1000) || findUrls(body)[0] || null
    if (!body && !url) fail(400, 'A note needs text or a url.')
    const all = await topics(c)
    const tags = [...new Set(strs(a.tags).map(cleanTag).filter(Boolean))]
    const row = {
      user_id: c.user, type: url ? 'link' : tags.includes('idea') ? 'idea' : 'note', body, url, kind: url ? kindFromUrl(url) ?? 'site' : null,
      tags, topic: all.some((t) => t.id === a.topic) ? a.topic : 'own', source: 'api',
    }
    const { data } = check(url
      ? await c.db.from('notes').upsert(row, { onConflict: 'user_id,url' }).select().single()
      : await c.db.from('notes').insert(row).select().single())
    return data
  },

  async list_habits(c: Caller) {
    const { data } = check(await c.db.from('habits').select('id, type, name, why, start_date, days, custom_data').eq('user_id', c.user).order('position'))
    return data ?? []
  },

  async get_focus(c: Caller) {
    const { data } = check(await c.db.from('settings').select('program').eq('user_id', c.user).maybeSingle())
    return { focus: data?.program?.focus ?? null }
  },

  async set_focus(c: Caller, a: Json) {
    const t = findTopic(await topics(c), a.id)
    if (t.kind !== 'learn') fail(400, 'Only a learning topic can be the focus.')
    const { data } = check(await c.db.from('settings').select('program').eq('user_id', c.user).maybeSingle())
    check(await c.db.from('settings').upsert({ user_id: c.user, program: { ...data?.program, focus: t.id }, updated_at: now() }, { onConflict: 'user_id' }))
    return { focus: t.id }
  },
}

export type OpName = keyof typeof ops

const DAY = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
function whenIn(x: Json): When {
  if (x === 'daily' || x?.kind === 'daily') return { kind: 'daily' }
  if (x?.kind === 'weekly') {
    const days = (Array.isArray(x.days) ? x.days : []).map((d: unknown) => (typeof d === 'number' ? d : DAY.indexOf(String(d).slice(0, 3).toLowerCase()))).filter((d: number) => d >= 0 && d <= 6)
    return days.length ? { kind: 'weekly', days: [...new Set<number>(days)].sort() } : fail(400, 'A weekly routine needs days.')
  }
  if (x?.kind === 'monthly') return { kind: 'monthly', day: x.day === -1 || (Number.isInteger(x.day) && x.day >= 1 && x.day <= 31) ? x.day : 1 }
  if (x?.kind === 'once' && /^\d{4}-\d{2}-\d{2}$/.test(x.date)) return { kind: 'once', date: x.date }
  return { kind: 'daily' }
}
