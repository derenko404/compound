// Wellbeing habits: the maths every skin shares, and each type's Today row. No UI here.
import type { Habit, HabitData, HabitType, State } from '@core/domain/types'
import { dates } from '@/shared/lib/dates'
import { t } from '@/shared/i18n'

const W = t.wellbeing

export const NEW_HABIT_DAYS = 21

// Quit smoking: health milestones by minutes since the quit day (their words are in the dictionary, same order), and tips shown on Today.
const DAY = 60 * 24
const MINS = [20, 720, DAY * 14, DAY * 30, DAY * 365, DAY * 365 * 5, DAY * 365 * 10, DAY * 365 * 15]
export const MILESTONES = W.milestones.map((m, i) => ({ ...m, mins: MINS[i] }))

export const CRAVING_TIPS = W.cravingTips

// Values in habit_logs.
export const DONE = 1
export const SLIP = -1

// What a fresh habit of each type starts with. Gym, water and smoking are one per account.
export const HABIT_DEFAULTS: Record<HabitType, { name: string; days: number[]; data: HabitData; single?: boolean }> = {
  gym: {
    name: W.types.gym.label, days: [1, 3, 5], single: true, data: {},
  },
  water: { name: W.types.water.label, days: [], data: { target: 8 }, single: true },
  smoking: { name: W.types.smoking.label, days: [], data: { per_day: 10, price: 100 }, single: true },
  build: { name: '', days: [], data: { target: NEW_HABIT_DAYS } },
  break: { name: '', days: [], data: {} },
}

export const habitsOf = (s: State) => [...s.habits].sort((a, b) => a.position - b.position)
export const logOf = (s: State, h: Habit) => s.habitLogs[h.id] ?? {}
export const valueOn = (s: State, h: Habit, k: string) => logOf(s, h)[k]

export const started = (h: Habit, today: Date) => !!h.start_date && dates.parseKey(h.start_date) <= today
export const dueOn = (h: Habit, d: Date) => started(h, d) && (!h.days.length || h.days.includes(d.getDay()))

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

/* ---------- Gym: workouts on chosen days, counted per week ---------- */

export function gymStats(s: State, h: Habit, today: Date) {
  const log = logOf(s, h)
  const monday = dates.addDays(today, -((today.getDay() + 6) % 7))
  const week = Array.from({ length: 7 }, (_, i) => log[dates.keyOf(dates.addDays(monday, i))] === DONE).filter(Boolean).length
  return {
    week, perWeek: h.days.length || 7,
    total: Object.values(log).filter((v) => v === DONE).length,
    month: Object.entries(log).filter(([d, v]) => v === DONE && d.startsWith(dates.keyOf(today).slice(0, 7))).length,
  }
}

// The goal is per week: a gym day missed this week can be made up on any later day.
// Returns the missed day ("Friday", in the form the catch-up phrases need) while the week is behind, else null.
export function gymMakeUp(s: State, h: Habit, today: Date) {
  if (!started(h, today) || !h.days.length) return null
  const log = logOf(s, h)
  const monday = dates.addDays(today, -((today.getDay() + 6) % 7))
  const past = Array.from({ length: (today.getDay() + 6) % 7 }, (_, i) => dates.addDays(monday, i))
  const scheduled = past.filter((d) => h.days.includes(d.getDay()))
  const done = past.filter((d) => log[dates.keyOf(d)] === DONE).length
  if (done >= scheduled.length || gymStats(s, h, today).week >= h.days.length) return null
  const missed = scheduled.find((d) => log[dates.keyOf(d)] !== DONE)
  return missed ? W.weekdays[missed.getDay()] : null
}

/* ---------- Water: glasses today against a target ---------- */

export function waterStats(s: State, h: Habit, today: Date) {
  const log = logOf(s, h)
  const target = h.custom_data.target ?? 8
  const monday = dates.addDays(today, -((today.getDay() + 6) % 7))
  return {
    today: log[dates.keyOf(today)] ?? 0,
    target,
    week: Array.from({ length: 7 }, (_, i) => {
      const d = dates.addDays(monday, i)
      return { day: d, value: log[dates.keyOf(d)] ?? 0, future: d > today }
    }),
    onTarget: Object.values(log).filter((v) => v >= target).length,
  }
}

/* ---------- Today ---------- */

export interface HabitRow { habit: Habit; title: string; sub: string; done: boolean }

// One row per habit due today. Its tick writes the habit's log, not the day's done list.
export function habitRows(s: State, today: Date): HabitRow[] {
  const k = dates.keyOf(today)
  const rows: HabitRow[] = []
  for (const h of habitsOf(s)) {
    const v = valueOn(s, h, k)
    // Gym also shows on a free day to make up a missed one, and stays once ticked.
    const makeUp = h.type === 'gym' && !dueOn(h, today) && started(h, today) ? gymMakeUp(s, h, today) : null
    if (!dueOn(h, today) && !makeUp && !(h.type === 'gym' && v === DONE)) continue
    switch (h.type) {
      case 'gym': {
        const { week, perWeek } = gymStats(s, h, today)
        rows.push({ habit: h, title: makeUp ? W.gym.rowCatchUp(h.name, makeUp) : h.name, sub: makeUp ? W.gym.rowMissed(makeUp, week, perWeek) : W.gym.rowWeek(week, perWeek), done: v === DONE })
        break
      }
      case 'water': {
        const { today: n, target } = waterStats(s, h, today)
        rows.push({ habit: h, title: W.water.rowTitle(h.name, n, target), sub: n >= target ? W.water.reached : W.water.toGo(target - n), done: n >= target })
        break
      }
      case 'smoking': {
        const n = dates.dayDiff(dates.parseKey(h.start_date!), today)
        rows.push({ habit: h, title: W.smoking.today, sub: v === SLIP ? W.slip.logged : CRAVING_TIPS[n % CRAVING_TIPS.length], done: v === DONE })
        break
      }
      case 'build': {
        const c = chain(s, h, today)
        rows.push({ habit: h, title: h.name, sub: c.complete ? W.build.rowBuilt(c.run) : W.build.rowDay(Math.min(c.day, c.target), c.target), done: v === DONE })
        break
      }
      case 'break':
        rows.push({ habit: h, title: W.clean.rowTitle(h.name), sub: v === SLIP ? W.slip.logged : h.why ?? '', done: v === DONE })
        break
    }
  }
  return rows
}
