// Pure functions that turn stored state into what the views show.
import { CH, CORE_IDS, CRAVING_TIPS, DAILY, DEFAULT_START, QUARTERS, TASKS, type DailyItem } from '@/data/plan'
import type { ChapterId, State } from './types'
import { addDays, dayDiff, keyOf, parseKey } from './dates'

export const startDate = (s: State) => parseKey(s.settings.start_date || DEFAULT_START)

export function programPos(s: State, today: Date) {
  const start = startDate(s)
  const months =
    (today.getFullYear() - start.getFullYear()) * 12 +
    (today.getMonth() - start.getMonth()) -
    (today.getDate() < start.getDate() ? 1 : 0)
  const before = today < start
  const total = dayDiff(start, new Date(start.getFullYear(), start.getMonth() + 18, start.getDate()))
  const dayN = dayDiff(start, today) + 1
  const m = before ? 0 : Math.max(0, months)
  const finished = m >= 18
  const q = Math.min(6, Math.floor(m / 3) + 1)
  const mi = finished ? 2 : m % 3
  return { before, total, dayN, q, mi, finished, daysToStart: before ? dayDiff(today, start) : 0 }
}

const weekIndex = (s: State, d: Date) => Math.floor(dayDiff(startDate(s), d) / 7)

function lightTrackChapter(s: State, d: Date, focus: ChapterId): ChapterId {
  const pool = (['tech', 'product', 'mgmt', 'biz', 'money'] as ChapterId[]).filter((c) => c !== focus)
  const w = ((weekIndex(s, d) % pool.length) + pool.length) % pool.length
  return pool[w]
}

export const quarterTasks = (q: number, ch?: ChapterId) => TASKS.filter((t) => t.q === q && (!ch || t.ch === ch))

function monthTask(q: number, mi: number, ch: ChapterId) {
  const list = quarterTasks(q, ch)
  return list.find((t) => t.m === mi) || list.find((t) => t.m === null) || list[0]
}

function cravingTip(s: State, d: Date) {
  const n = dayDiff(startDate(s), d) % CRAVING_TIPS.length
  return CRAVING_TIPS[n < 0 ? 0 : n]
}

export const gymCount = (s: State) => Object.values(s.days).filter((d) => d.done.includes('gym')).length

export function todayItems(s: State, today: Date): DailyItem[] {
  const pos = programPos(s, today)
  const Q = QUARTERS[pos.q - 1]
  const wd = today.getDay()
  const items: DailyItem[] = DAILY.map((d) => ({ ...d }))
  const focusTask = monthTask(pos.q, pos.mi, Q.focus)
  if (wd === 1 || wd === 3)
    items.push({ id: 'study', ch: Q.focus, title: `Study 45 minutes: ${CH[Q.focus].short}`, sub: focusTask?.text ?? '' })
  if (wd === 4) {
    const lc = lightTrackChapter(s, today, Q.focus)
    const lt = monthTask(pos.q, pos.mi, lc)
    items.push({ id: 'light', ch: lc, title: `Light track 30 minutes: ${CH[lc].short}`, sub: lt?.text ?? '' })
  }
  if (wd === 6) items.push({ id: 'project', ch: Q.focus, title: 'Project block: 2 hours', sub: Q.project })
  if (wd === 0)
    items.push({ id: 'review', ch: 'own', title: 'Weekly review: 20 minutes', sub: "Tick finished tasks, note what worked, pick next week's 3 tasks" })
  if (today.getDate() === 1)
    items.push({ id: 'money-check', ch: 'money', title: 'Monthly money check-in', sub: 'Update spending, savings rate and net worth' })
  if (addDays(today, 1).getDate() === 1)
    items.push({ id: 'matrix', ch: 'own', title: 'Re-score your skill matrix', sub: '1 to 5 for each skill, in the Overview tab of the doc' })

  const { quit, gym_start } = s.settings
  if (quit?.date && parseKey(quit.date) <= today)
    items.push({ id: 'smoke-free', ch: 'smoke', title: 'Smoke-free today', sub: cravingTip(s, today) })
  if (gym_start && parseKey(gym_start) <= today && (wd === 1 || wd === 3 || wd === 5)) {
    const a = gymCount(s) % 2 === 0
    items.push({
      id: 'gym',
      ch: 'gym',
      title: `Workout ${a ? 'A' : 'B'}`,
      sub: a ? 'Squat, bench press, barbell row: 3 × 5–8' : 'Deadlift, overhead press, pull-ups: 3 × 5–8',
    })
  }

  const k = keyOf(today)
  for (const t of s.tasks) {
    const hit = t.repeat === 'daily' || (t.repeat === 'weekly' && t.weekday === wd) || (t.repeat === 'once' && t.date === k)
    if (hit)
      items.push({
        id: t.id,
        ch: t.chapter,
        title: t.title,
        sub: t.repeat === 'once' ? 'Added by you' : t.repeat === 'daily' ? 'Every day' : 'Every week',
        own: true,
      })
  }
  return items
}

const coreDone = (s: State, k: string) => {
  const d = s.days[k]
  return !!d && CORE_IDS.every((id) => d.done.includes(id))
}

export function streak(s: State, today: Date) {
  let n = 0
  let d = new Date(today)
  if (!coreDone(s, keyOf(d))) d = addDays(d, -1)
  while (coreDone(s, keyOf(d)) && n < 2000) {
    n++
    d = addDays(d, -1)
  }
  return n
}

export function bestStreak(s: State) {
  const keys = Object.keys(s.days).sort()
  let best = 0
  let run = 0
  let prev: string | null = null
  for (const k of keys) {
    const ok = coreDone(s, k)
    if (!ok) run = 0
    else if (prev && dayDiff(parseKey(prev), parseKey(k)) === 1) run++
    else run = 1
    best = Math.max(best, run)
    prev = ok ? k : null
  }
  return best
}
