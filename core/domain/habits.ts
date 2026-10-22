// Habit maths with no words in it, shared by the app (src/features/habits) and the worker's reminders.
import type { Habit, State } from './types'
import { days } from './days'

// Values in habit_logs.
export const DONE = 1
export const SLIP = -1

export const habitsOf = (s: State) => [...s.habits].sort((a, b) => a.position - b.position)
export const logOf = (s: State, h: Habit) => s.habitLogs[h.id] ?? {}
export const valueOn = (s: State, h: Habit, k: string) => logOf(s, h)[k]

export const started = (h: Habit, today: Date) => !!h.start_date && days.parseKey(h.start_date) <= today
export const dueOn = (h: Habit, d: Date) => started(h, d) && (!h.days.length || h.days.includes(d.getDay()))

/* ---------- Gym: workouts on chosen days, counted per week ---------- */

export function gymStats(s: State, h: Habit, today: Date) {
  const log = logOf(s, h)
  const monday = days.addDays(today, -((today.getDay() + 6) % 7))
  const week = Array.from({ length: 7 }, (_, i) => log[days.keyOf(days.addDays(monday, i))] === DONE).filter(Boolean).length
  return {
    week, perWeek: h.days.length || 7,
    total: Object.values(log).filter((v) => v === DONE).length,
    month: Object.entries(log).filter(([d, v]) => v === DONE && d.startsWith(days.keyOf(today).slice(0, 7))).length,
  }
}

// The goal is per week: a gym day missed this week can be made up on any later day. The missed day while the week is behind, else null.
export function gymMissedDay(s: State, h: Habit, today: Date) {
  if (!started(h, today) || !h.days.length) return null
  const log = logOf(s, h)
  const monday = days.addDays(today, -((today.getDay() + 6) % 7))
  const past = Array.from({ length: (today.getDay() + 6) % 7 }, (_, i) => days.addDays(monday, i))
  const scheduled = past.filter((d) => h.days.includes(d.getDay()))
  const done = past.filter((d) => log[days.keyOf(d)] === DONE).length
  if (done >= scheduled.length || gymStats(s, h, today).week >= h.days.length) return null
  return scheduled.find((d) => log[days.keyOf(d)] !== DONE) ?? null
}

/* ---------- An amount a day against a target: water, sleep, meditation, reading ---------- */

export type AmountType = 'water' | 'sleep' | 'meditation' | 'reading'

// Each amount's default target and the step its stepper moves by (water counts glasses one by one).
export const AMOUNTS: Record<AmountType, { target: number; step: number }> = {
  water: { target: 8, step: 1 },
  sleep: { target: 8, step: 0.5 },
  meditation: { target: 10, step: 5 },
  reading: { target: 10, step: 5 },
}

export const isAmount = (h: Habit): h is Habit & { type: AmountType } => h.type in AMOUNTS

export function amountStats(s: State, h: Habit & { type: AmountType }, today: Date) {
  const log = logOf(s, h)
  const target = h.custom_data.target ?? AMOUNTS[h.type].target
  const logged = Object.entries(log).filter(([, v]) => v > 0)
  const recent = logged.filter(([d]) => d > days.keyOf(days.addDays(today, -7)) && d <= days.keyOf(today))
  const monday = days.addDays(today, -((today.getDay() + 6) % 7))
  return {
    today: log[days.keyOf(today)] ?? 0,
    target,
    week: Array.from({ length: 7 }, (_, i) => {
      const d = days.addDays(monday, i)
      return { day: d, value: log[days.keyOf(d)] ?? 0, future: d > today }
    }),
    onTarget: Object.values(log).filter((v) => v >= target).length,
    // The average over the logged days of the last week (sleep's "7.2 h a night").
    average: recent.length ? recent.reduce((n, [, v]) => n + v, 0) / recent.length : 0,
    total: logged.reduce((n, [, v]) => n + v, 0),
  }
}
