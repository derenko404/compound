// Pure functions that turn stored state into what the views show.
import type { Chapter, ChapterId, PlanTask, Routine, State } from './types'
import { DEFAULT_START, chapterOf, chapters, matchesWhen, program } from './content'
import { addDays, dayDiff, keyOf, parseKey } from './dates'

export const startDate = (s: State) => parseKey(s.settings.start_date || DEFAULT_START)

export function programPos(s: State, today: Date) {
  const start = startDate(s)
  const len = program(s).months
  const months =
    (today.getFullYear() - start.getFullYear()) * 12 +
    (today.getMonth() - start.getMonth()) -
    (today.getDate() < start.getDate() ? 1 : 0)
  const before = today < start
  const total = dayDiff(start, new Date(start.getFullYear(), start.getMonth() + len, start.getDate()))
  const dayN = dayDiff(start, today) + 1
  const finished = !before && months >= len
  // Month index into the program, clamped so a finished program still shows its last month.
  const m = before ? 0 : Math.min(len - 1, Math.max(0, months))
  const quarters = Math.ceil(len / 3)
  return { before, total, dayN, m, q: Math.floor(m / 3) + 1, mi: m % 3, quarters, finished, daysToStart: before ? dayDiff(today, start) : 0 }
}

export const quarterPlan = (s: State, q: number) => program(s).quarters[q - 1] ?? { focus: null, project: '' }

export interface TaskRef extends PlanTask { ch: ChapterId }

export const allTasks = (s: State): TaskRef[] => chapters(s, 'learn').flatMap((c) => c.tasks.map((t) => ({ ...t, ch: c.id })))
export const isActive = (t: PlanTask, m: number) => t.from <= m && m <= t.to
export const tasksInMonth = (s: State, m: number) => allTasks(s).filter((t) => isActive(t, m))
export const tasksInQuarter = (s: State, q: number) => allTasks(s).filter((t) => t.from <= q * 3 - 1 && t.to >= (q - 1) * 3)
export const chapterActive = (c: Chapter, m: number) => c.start <= m && m < c.start + c.months

// The most specific open task of a chapter for this month.
export function monthTask(s: State, ch: ChapterId, m: number) {
  const c = chapterOf(s, ch)
  const list = (c?.tasks ?? []).filter((t) => isActive(t, m)).sort((a, b) => a.to - a.from - (b.to - b.from))
  return list.find((t) => !s.plan[t.id]) ?? list[0]
}

const weekIndex = (s: State, d: Date) => Math.floor(dayDiff(startDate(s), d) / 7)

// Rotates through the learn chapters that aren't the focus and don't already have a daily routine.
function lightTrackChapter(s: State, d: Date, m: number, focus: ChapterId | null): ChapterId | null {
  const daily = new Set(s.routines.filter((r) => r.core).map((r) => r.chapter))
  const pool = chapters(s, 'learn').filter((c) => c.id !== focus && !daily.has(c.id) && chapterActive(c, m)).map((c) => c.id)
  if (!pool.length) return null
  const w = ((weekIndex(s, d) % pool.length) + pool.length) % pool.length
  return pool[w]
}

export const checkCount = (s: State, id: string) => Object.values(s.days).filter((d) => d.done.includes(id)).length

export interface DayItem {
  id: string
  ch: ChapterId
  title: string
  sub: string
  routine?: Routine // set when the item comes from an editable routine
}

export function todayItems(s: State, today: Date): DayItem[] {
  const pos = programPos(s, today)
  const Q = quarterPlan(s, pos.q)
  const k = keyOf(today)
  const items: DayItem[] = []

  for (const r of [...s.routines].sort((a, b) => a.position - b.position)) {
    if (!matchesWhen(r.when, today, k)) continue
    let ch = r.chapter
    let title = r.title
    let sub = r.sub ?? ''
    if (r.fill === 'focus' && Q.focus) {
      ch = Q.focus
      title = `${r.title}: ${chapterOf(s, ch)?.name ?? ''}`
      sub = monthTask(s, ch, pos.m)?.text ?? sub
    } else if (r.fill === 'light') {
      const lc = lightTrackChapter(s, today, pos.m, Q.focus)
      if (!lc) continue
      ch = lc
      title = `${r.title}: ${chapterOf(s, ch)?.name ?? ''}`
      sub = monthTask(s, ch, pos.m)?.text ?? sub
    } else if (r.fill === 'project') {
      ch = Q.focus ?? ch
      sub = Q.project || sub
    }
    items.push({ id: r.id, ch, title, sub, routine: r })
  }

  // Trackers switched on in chapters (health ones, usually).
  for (const c of chapters(s)) {
    const { quit, workout } = c.components ?? {}
    if (quit?.date && parseKey(quit.date) <= today) {
      const n = dayDiff(parseKey(quit.date), today)
      const tip = quit.tips.length ? quit.tips[n % quit.tips.length] : ''
      items.push({ id: quit.check_id, ch: c.id, title: quit.check_title || `${c.name}: clean today`, sub: tip })
    }
    if (workout?.start && parseKey(workout.start) <= today && workout.days.includes(today.getDay()) && workout.workouts.length) {
      // Today's tick doesn't move the rotation; only earlier days do.
      const done = Object.entries(s.days).filter(([d, l]) => d < k && l.done.includes(workout.check_id)).length
      const w = workout.workouts[done % workout.workouts.length]
      items.push({ id: workout.check_id, ch: c.id, title: w.name, sub: w.text })
    }
  }
  return items
}

// How much of a day's list was ticked. Past days are measured against today's routines.
export function dayProgress(s: State, d: Date) {
  const items = todayItems(s, d)
  const done = new Set(s.days[keyOf(d)]?.done ?? [])
  return { done: items.filter((i) => done.has(i.id)).length, total: items.length }
}

const coreIds = (s: State) => s.routines.filter((r) => r.core).map((r) => r.id)

const coreDone = (ids: string[], s: State, k: string) => {
  const d = s.days[k]
  return !!d && ids.length > 0 && ids.every((id) => d.done.includes(id))
}

export function streak(s: State, today: Date) {
  const ids = coreIds(s)
  let n = 0
  let d = new Date(today)
  if (!coreDone(ids, s, keyOf(d))) d = addDays(d, -1)
  while (coreDone(ids, s, keyOf(d)) && n < 2000) {
    n++
    d = addDays(d, -1)
  }
  return n
}

export function bestStreak(s: State) {
  const ids = coreIds(s)
  const keys = Object.keys(s.days).sort()
  let best = 0
  let run = 0
  let prev: string | null = null
  for (const k of keys) {
    const ok = coreDone(ids, s, k)
    if (!ok) run = 0
    else if (prev && dayDiff(parseKey(prev), parseKey(k)) === 1) run++
    else run = 1
    best = Math.max(best, run)
    prev = ok ? k : null
  }
  return best
}
