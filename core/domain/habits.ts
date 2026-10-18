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

/* ---------- Water: glasses today against a target ---------- */

export function waterStats(s: State, h: Habit, today: Date) {
  const log = logOf(s, h)
  const target = h.custom_data.target ?? 8
  const monday = days.addDays(today, -((today.getDay() + 6) % 7))
  return {
    today: log[days.keyOf(today)] ?? 0,
    target,
    week: Array.from({ length: 7 }, (_, i) => {
      const d = days.addDays(monday, i)
      return { day: d, value: log[days.keyOf(d)] ?? 0, future: d > today }
    }),
    onTarget: Object.values(log).filter((v) => v >= target).length,
  }
}
