// Helpers over the editable content in State. Shared with the Telegram worker, so keep it free of DOM and app imports.
import type { Topic, TopicId, TopicKind, ListDef, Note, Program, ProjectSize, ResourceKind, State, When } from './types'

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
export const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// Topic colours: each key has a light and a dark value in index.css (--p-<key>).
export const PALETTE = ['blue', 'orange', 'purple', 'green', 'pink', 'amber', 'slate', 'teal', 'gray', 'red', 'indigo', 'lime'] as const



export const RESOURCE_KINDS: { id: ResourceKind; label: string }[] = [
  { id: 'book', label: 'Books' },
  { id: 'course', label: 'Courses' },
  { id: 'video', label: 'Videos' },
  { id: 'article', label: 'Articles' },
  { id: 'podcast', label: 'Podcasts' },
  { id: 'doc', label: 'Docs and guides' },
  { id: 'tool', label: 'Tools and apps' },
  { id: 'practice', label: 'Practice' },
  { id: 'other', label: 'Other' },
]

export const program = (s: State): Program => ({ focus: null, ...s.settings.program })

export const byPosition = <T extends { position: number }>(xs: T[]) => [...xs].sort((a, b) => a.position - b.position)
export const nextPosition = (xs: { position: number }[]) => xs.reduce((m, x) => Math.max(m, x.position), -1) + 1

export const topics = (s: State, kind?: TopicKind) => byPosition(s.topics.filter((c) => !c.archived && (!kind || c.kind === kind)))
export const topicOf = (s: State, id: TopicId | null | undefined): Topic | undefined => (id ? s.topics.find((c) => c.id === id) : undefined)
export const topicName = (s: State, id: TopicId | null | undefined) => topicOf(s, id)?.name ?? 'No topic'

// The topic notes fall back to when nothing else fits.
export const FALLBACK_TOPIC = 'own'

export const slugify = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)

// A short, CSS-safe id that isn't taken yet.
export function freshId(name: string, taken: Iterable<string>) {
  const used = new Set(taken)
  const base = slugify(name) || 'item'
  let id = base
  for (let i = 2; used.has(id); i++) id = `${base}-${i}`
  return id
}

export const uid = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`)

export function matchesWhen(w: When, d: Date, key: string) {
  switch (w.kind) {
    case 'daily':
      return true
    case 'weekly':
      return w.days.includes(d.getDay())
    case 'monthly': {
      if (w.day > 0) return d.getDate() === w.day
      const next = new Date(d)
      next.setDate(d.getDate() + 1)
      return next.getDate() === 1
    }
    case 'once':
      return w.date === key
  }
}

export function describeWhen(w: When) {
  switch (w.kind) {
    case 'daily':
      return 'Every day'
    case 'weekly':
      return w.days.length === 7 ? 'Every day' : `Every ${[...w.days].sort().map((d) => WEEKDAYS_SHORT[d]).join(', ')}`
    case 'monthly':
      return w.day > 0 ? `Monthly, on day ${w.day}` : 'Monthly, on the last day'
    case 'once':
      return `On ${w.date}`
  }
}

// Project codes: the topic's first two letters plus a number (TE1, TE2…). A topic whose first two letters
// an earlier topic already uses takes three, so codes stay unique across topics.
const letters = (name: string) => name.toUpperCase().normalize('NFKD').replace(/[^A-Z]/g, '')

export function codePrefix(c: Topic, all: Topic[]) {
  const mine = letters(c.name) || 'PR'
  const earlier = all.filter((x) => x.id !== c.id && (x.position < c.position || (x.position === c.position && x.id < c.id)))
  const clash = earlier.some((x) => letters(x.name).slice(0, 2) === mine.slice(0, 2))
  return clash && mine.length > 2 ? mine.slice(0, 3) : mine.slice(0, 2)
}

export function nextProjectCode(c: Topic, all: Topic[]) {
  const prefix = codePrefix(c, all)
  const used = c.projects.map((p) => (p.code.startsWith(prefix) ? Number(p.code.slice(prefix.length)) || 0 : 0))
  return `${prefix}${Math.max(0, ...used) + 1}`
}


/* ---------- Share by link ---------- */

// What a share holds: the content only. Ticks, notes and progress live in other tables and never go along.
export const topicSnapshot = (c: Topic): Topic => {
  const { position: _p, created_at: _c, archived: _a, ...rest } = c
  return { ...rest, position: 0 }
}
export const listSnapshot = (l: ListDef): ListDef => ({ ...l, position: 0 })

// Someone else's shared topic as a new topic of mine: fresh ids everywhere, a free id and colour, codes from my topics.
export function topicFromShare(shared: Topic, mine: Topic[]): Topic {
  const c: Topic = {
    ...normalizeTopic(shared), kind: 'learn', id: freshId(shared.name, mine.map((x) => x.id)), position: nextPosition(mine),
    created_at: new Date().toISOString(), archived: undefined,
  }
  c.skills = c.skills.map((k) => ({ ...k, id: uid(), steps: k.steps.map((t) => ({ ...t, id: uid() })) }))
  c.resources = c.resources.map((r) => ({ ...r, id: uid() }))
  const prefix = codePrefix(c, [...mine, c])
  c.projects = c.projects.map((p, i) => ({ ...p, id: uid(), code: `${prefix}${i + 1}` }))
  return c
}

export const listFromShare = (shared: ListDef, mine: ListDef[]): ListDef => ({
  ...shared, id: freshId(shared.name, mine.map((x) => x.id)), position: nextPosition(mine),
})

// Topics are stored as JSON, so one saved in an older shape could break a page. Every loaded topic is brought to the
// current shape: missing lists become empty, entries in an old format (skills as plain names, checklists) are dropped.
export const PROJECT_SIZES: { value: ProjectSize; label: string; means: string }[] = [
  { value: 'small', label: 'Small', means: 'a few hours to a few days' },
  { value: 'medium', label: 'Medium', means: 'one to a few weeks' },
  { value: 'big', label: 'Big', means: 'a month or more' },
]
export const sizeLabel = (s: ProjectSize) => {
  const z = PROJECT_SIZES.find((x) => x.value === s)
  return z ? `${z.label}, ${z.means}` : s
}

const list = <T,>(x: unknown, ok: (v: T) => boolean = () => true): T[] => (Array.isArray(x) ? (x as T[]).filter((v) => v && typeof v === 'object' && ok(v)) : [])

export function normalizeTopic(raw: Topic): Topic {
  const c = raw as Topic & Record<string, unknown>
  return {
    ...c,
    outcomes: Array.isArray(c.outcomes) ? c.outcomes.filter((x) => typeof x === 'string') : [],
    projects: list<Topic['projects'][number]>(c.projects).map((p) => ({ ...p, trains: Array.isArray(p.trains) ? p.trains : undefined, size: PROJECT_SIZES.some((s) => s.value === p.size) ? p.size : undefined })),
    resources: list(c.resources),
    skills: list<Topic['skills'][number]>(c.skills, (k) => Array.isArray(k.steps)),
  }
}

const normalizeNote = (n: Note): Note => ({
  ...n,
  type: n.type ?? (n.url ? 'link' : 'note'),
  body: n.body ?? '', url: n.url ?? null, kind: n.kind ?? null, context: n.context ?? '',
  topic: n.topic ?? null, source: n.source ?? 'app',
  tags: Array.isArray(n.tags) ? n.tags : [],
})

// Routines that used to fill from the topics (old shape) are dropped: Today's topic rows replace them.
// So are habit topics (old kind 'health'): habits have their own table now.
export const normalizeState = (s: State): State => ({
  ...s, topics: (s.topics ?? []).filter((c) => c.kind === 'learn' || c.kind === 'general').map(normalizeTopic), notes: (s.notes ?? []).map(normalizeNote),
  routines: (s.routines ?? []).filter((r) => !('fill' in r)),
  habits: s.habits ?? [],
  habitLogs: s.habitLogs ?? {},
})
