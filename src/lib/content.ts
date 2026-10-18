// Helpers over the editable content in State. Shared with the Telegram worker, so keep it free of DOM and app imports.
import type { Chapter, ChapterId, ChapterKind, Program, ResourceKind, State, When } from './types'

export const DEFAULT_START = '2026-11-01'
export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
export const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// Chapter colours: each key has a light and a dark value in index.css (--p-<key>).
export const PALETTE = ['blue', 'orange', 'purple', 'green', 'pink', 'amber', 'slate', 'teal', 'gray', 'red', 'indigo', 'lime'] as const

export const KIND_LABEL: Record<ChapterKind, string> = { learn: 'Roadmap chapter', health: 'Health', general: 'General' }

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

export const defaultProgram = (): Program => ({ months: 18, quarters: [] })
export const program = (s: State): Program => ({ ...defaultProgram(), ...s.settings.program })

export const byPosition = <T extends { position: number }>(xs: T[]) => [...xs].sort((a, b) => a.position - b.position)
export const nextPosition = (xs: { position: number }[]) => xs.reduce((m, x) => Math.max(m, x.position), -1) + 1

export const chapters = (s: State, kind?: ChapterKind) => byPosition(s.chapters.filter((c) => !c.archived && (!kind || c.kind === kind)))
export const chapterOf = (s: State, id: ChapterId | null | undefined): Chapter | undefined => (id ? s.chapters.find((c) => c.id === id) : undefined)
export const chapterName = (s: State, id: ChapterId | null | undefined) => chapterOf(s, id)?.name ?? 'No chapter'

// The chapter notes fall back to when nothing else fits.
export const FALLBACK_CHAPTER = 'own'

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

export const monthLabel = (start: Date, m: number, year = false) =>
  new Date(start.getFullYear(), start.getMonth() + m, 1).toLocaleDateString('en-GB', year ? { month: 'short', year: 'numeric' } : { month: 'short' })

// Years are added once a range is long enough for month names alone to be ambiguous.
export const monthRange = (start: Date, from: number, to: number) =>
  from === to ? monthLabel(start, from) : `${monthLabel(start, from, to - from >= 11)}–${monthLabel(start, to, to - from >= 11)}`

// How the method works. Product copy, the same for every user, so it lives here rather than in their data.
export const HOW_IT_WORKS = [
  'Chapters run in parallel. Each one has a month-by-month plan, resources, projects, checklists and tips.',
  'Every quarter has one focus chapter; the others run as light tracks, so nothing stalls and nothing overloads you.',
  'Each skill gets a project, because building and doing beats watching.',
  'Today is built from your routines: daily habits, study sessions for the focus chapter, a light-track slot that rotates through the other chapters, and a weekend project block.',
  'A day counts for your streak when every streak routine is ticked. When a week goes badly, keep only those. Streaks beat intensity.',
  "Health points sit beside the roadmap. Start one whenever you're ready; its trackers add a daily check to Today.",
  'Daily (2 min): one line in the learning log: what you learned or did today.',
  "Weekly (30 min): tick finished tasks, note what worked and what didn't, and pick next week's 3 tasks.",
  'Monthly (1 h): ship one visible output (a post, demo, design doc or talk) and re-score your skills.',
  'Quarterly (2 h): run a retro, ask 2 people for honest feedback, then adjust the next quarter.',
  "Yearly: a big retro. Keep the chapters that pay off, drop the rest, and pick next year's focus.",
  'Learn in public: post one short write-up a month. It trains writing and builds your reputation at once.',
  'Score each skill 1–5 (1 = never done it, 3 = can do it alone, 5 = can teach it) when you start, then every quarter.',
]
