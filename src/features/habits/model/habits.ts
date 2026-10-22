// Wellbeing habits: the maths every skin shares, and each type's Today row. No UI here.
import type { Habit, HabitData, HabitType, State } from '@core/domain/types'
import { AMOUNTS, DONE, SLIP, amountStats, dueOn, gymMissedDay, gymStats, habitsOf, isAmount, logOf, started, valueOn } from '@core/domain/habits'
import { dates } from '@/shared/lib/dates'
import { currentLocale, t } from '@/shared/i18n'

// The maths with no words lives in core, so the worker's reminders use it too.
export { AMOUNTS, DONE, SLIP, amountStats, dueOn, gymStats, habitsOf, isAmount, logOf, started, valueOn, type AmountType } from '@core/domain/habits'

const W = t.wellbeing

export const NEW_HABIT_DAYS = 21

// An amount as shown (sleep's 7.5 h, in the reader's own decimals).
export const amountText = (n: number) => n.toLocaleString(currentLocale(), { maximumFractionDigits: 1 })

// Quit smoking: health milestones by minutes since the quit day (their words are in the dictionary, same order), and tips shown on Today.
const DAY = 60 * 24
const MINS = [20, 720, DAY * 14, DAY * 30, DAY * 365, DAY * 365 * 5, DAY * 365 * 10, DAY * 365 * 15]
export const MILESTONES = W.milestones.map((m, i) => ({ ...m, mins: MINS[i] }))

export const CRAVING_TIPS = W.cravingTips

// What a fresh habit of each type starts with. The ready-made ones (all but build and break) are one per account.
export const HABIT_DEFAULTS: Record<HabitType, { name: string; days: number[]; data: HabitData; single?: boolean }> = {
  gym: {
    name: W.types.gym.label, days: [1, 3, 5], single: true, data: {},
  },
  water: { name: W.types.water.label, days: [], data: { target: AMOUNTS.water.target }, single: true },
  sleep: { name: W.types.sleep.label, days: [], data: { target: AMOUNTS.sleep.target }, single: true },
  meditation: { name: W.types.meditation.label, days: [], data: { target: AMOUNTS.meditation.target }, single: true },
  reading: { name: W.types.reading.label, days: [], data: { target: AMOUNTS.reading.target }, single: true },
  smoking: { name: W.types.smoking.label, days: [], data: { per_day: 10, price: 100 }, single: true },
  build: { name: '', days: [], data: { target: NEW_HABIT_DAYS } },
  break: { name: '', days: [], data: {} },
}

export const weekOf = (today: Date) => {
  const monday = dates.addDays(today, -((today.getDay() + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => dates.addDays(monday, i))
}

/* ---------- Break a habit, quit smoking: clean days since the start, minus slips ---------- */

export function cleanStats(s: State, h: Habit, today: Date) {
  if (!started(h, today)) return { clean: 0, run: 0, best: 0, slips: 0 }
  const log = logOf(s, h)
  const start = dates.parseKey(h.start_date!)
  let clean = 0, run = 0, best = 0, slips = 0
  // Days before today count as clean unless a slip was logged; today counts once confirmed.
  for (let d = start; d <= today; d = dates.addDays(d, 1)) {
    const v = log[dates.keyOf(d)]
    if (v === SLIP) { slips++; run = 0; continue }
    if (dates.keyOf(d) === dates.keyOf(today) && v !== DONE) continue
    clean++
    best = Math.max(best, ++run)
  }
  return { clean, run, best, slips }
}

export function smokingStats(s: State, h: Habit, today: Date, now = Date.now()) {
  const { clean, run, best, slips } = cleanStats(s, h, today)
  const perDay = h.custom_data.per_day ?? 0
  const mins = h.start_date ? Math.max(0, (now - dates.parseKey(h.start_date).getTime()) / 6e4) : 0
  const next = MILESTONES.find((m) => m.mins > mins)
  const prev = [...MILESTONES].reverse().find((m) => m.mins <= mins)
  return {
    clean, run, best, slips,
    saved: (clean * perDay / 20) * (h.custom_data.price ?? 0),
    avoided: Math.round(clean * perDay),
    milestones: MILESTONES.map((m) => ({ ...m, hit: m.mins <= mins })),
    next,
    // How far between the last milestone and the next one.
    toNext: next ? (mins - (prev?.mins ?? 0)) / (next.mins - (prev?.mins ?? 0)) : 1,
  }
}

/* ---------- New habit: an unbroken chain of done days; a missed day restarts it ---------- */

export function chain(s: State, h: Habit, today: Date) {
  const target = h.custom_data.target ?? NEW_HABIT_DAYS
  if (!started(h, today)) return { run: 0, day: 0, target, doneToday: false, complete: false }
  const log = logOf(s, h)
  const start = dates.parseKey(h.start_date!)
  const doneToday = log[dates.keyOf(today)] === DONE
  let run = doneToday ? 1 : 0
  for (let d = dates.addDays(today, -1); d >= start && log[dates.keyOf(d)] === DONE; d = dates.addDays(d, -1)) run++
  // Once a chain reached the target the habit is built, even if a later day was missed.
  let longest = 0, cur = 0
  for (let d = start; d <= today; d = dates.addDays(d, 1)) {
    cur = log[dates.keyOf(d)] === DONE ? cur + 1 : 0
    longest = Math.max(longest, cur)
  }
  return { run, day: doneToday ? run : run + 1, target, doneToday, complete: longest >= target }
}

// A missed gym day this week, as the weekday name the catch-up phrases need ("Friday"), else null.
export function gymMakeUp(s: State, h: Habit, today: Date) {
  const missed = gymMissedDay(s, h, today)
  return missed ? W.weekdays[missed.getDay()] : null
}

/* ---------- Today ---------- */

/**
 * The row's text is the habit's name. sub is today's value ("3/10 pages"), then a note when there is one (a day to
 * catch up, a slip). progress (0..1) fills the row's check as a ring.
 */
export interface HabitRow { habit: Habit; title: string; sub: string; done: boolean; progress: number }

const cleanText = (n: number) => W.amountValue(String(n), W.clean.days(n))

// One row per habit due today. Its tick writes the habit's log, not the day's done list.
export function habitRows(s: State, today: Date): HabitRow[] {
  const k = dates.keyOf(today)
  return habitsOf(s).filter((h) => {
    // Gym also shows on a free day to make up a missed one, and stays once ticked.
    const makeUp = h.type === 'gym' && !dueOn(h, today) && started(h, today) && gymMakeUp(s, h, today)
    return dueOn(h, today) || makeUp || (h.type === 'gym' && valueOn(s, h, k) === DONE)
  }).map((h) => habitRow(s, h, today))
}

// A habit's row for today, due or not (Wellbeing lists them all). One not started yet says when it starts.
export function habitRow(s: State, h: Habit, today: Date): HabitRow {
  const v = valueOn(s, h, dates.keyOf(today))
  const done = v === DONE
  const row = { habit: h, title: h.name, done, progress: done ? 1 : 0 }
  if (!started(h, today)) return { ...row, sub: waitingText(h, today) }
  const sub = (value: string, note?: string | null) => (note ? W.rowValue.withNote(value, note) : value)
  const slip = v === SLIP ? W.slip.logged : null
  switch (h.type) {
    case 'gym': {
      const { week, perWeek } = gymStats(s, h, today)
      const makeUp = !dueOn(h, today) ? gymMakeUp(s, h, today) : null
      return { ...row, sub: sub(W.rowValue.week(week, perWeek), makeUp && W.gym.rowCatchUp(makeUp)) }
    }
    case 'water': case 'sleep': case 'meditation': case 'reading': {
      const { today: n, target } = amountStats(s, { ...h, type: h.type }, today)
      return { ...row, sub: W.rowValue.amount(amountText(n), amountText(target), W.amounts[h.type].unit), done: n >= target, progress: Math.min(1, n / target) }
    }
    case 'smoking': return { ...row, sub: sub(cleanText(smokingStats(s, h, today).clean), slip) }
    case 'break': return { ...row, sub: sub(cleanText(cleanStats(s, h, today).clean), slip) }
    case 'build': {
      const c = chain(s, h, today)
      return { ...row, sub: c.complete ? W.build.built : W.rowValue.chain(Math.min(c.day, c.target), c.target) }
    }
  }
}

// What a row's tick writes: an amount fills its target, the rest log the day as done. Unticking clears it.
export const tickValue = (s: State, h: Habit, today: Date, on: boolean) =>
  on ? (isAmount(h) ? amountStats(s, h, today).target : DONE) : null

// The label of a habit's start date, as its form names it ("Quit day", "Day 1").
export const START_LABEL: Record<HabitType, string> = W.start

// When a habit not started yet begins, or that it has no start date.
export const waitingText = (h: Habit, today: Date) => h.start_date
  ? W.waiting(START_LABEL[h.type], dates.fmtShort(dates.parseKey(h.start_date)), dates.dayDiff(today, dates.parseKey(h.start_date)))
  : W.notStarted
