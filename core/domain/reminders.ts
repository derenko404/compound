// Daily push reminders: when a device gets one, and what's left to put in it. The worker's hourly cron runs this.
import type { State } from './types'
import { matchesWhen, topics } from './content'
import { days } from './days'
import { DONE, SLIP, dueOn, gymMissedDay, habitsOf, started, valueOn, waterStats } from './habits'

// Evening reminders repeat every 2 hours from the chosen hour until this one.
export const LAST_HOUR = 22
export const MORNING_HOURS = [6, 7, 8, 9, 10, 11]
export const EVENING_HOURS = [16, 17, 18, 19, 20, 21, 22]

// last: the evening's final reminder.
export type ReminderKind = 'morning' | 'evening' | 'last'

export interface ReminderHours { morning_hour: number | null; evening_hour: number }

function kindAt(hour: number, h: ReminderHours): ReminderKind | null {
  if (hour === h.morning_hour) return 'morning'
  if (hour >= h.evening_hour && hour <= LAST_HOUR && (hour - h.evening_hour) % 2 === 0) return hour + 2 > LAST_HOUR ? 'last' : 'evening'
  return null
}

/**
 * The wall clock in a time zone, as a Date whose local fields hold it. The worker runs in UTC, so day keys and
 * weekdays then come out as the user sees them. An unknown zone falls back to UTC.
 */
function wallClock(now: Date, timeZone: string) {
  let parts: Intl.DateTimeFormatPart[]
  try {
    parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', hourCycle: 'h23' }).formatToParts(now)
  } catch {
    return wallClock(now, 'UTC')
  }
  const n = (type: string) => Number(parts.find((p) => p.type === type)?.value)
  return new Date(n('year'), n('month') - 1, n('day'), n('hour'))
}

/**
 * Your own tasks and habits today: how many, and the ones still open by name (water with its glasses:
 * "Water 3/8"). Topic tasks count too; the rows built from the topics are suggestions and never do. Matches the
 * Today page's task and habit rows.
 */
function ownToday(s: State, today: Date) {
  const k = days.keyOf(today)
  const done = new Set(s.days[k]?.done ?? [])
  const due = [
    ...[...s.routines].sort((a, b) => a.position - b.position),
    ...topics(s).flatMap((c) => c.tasks),
  ].filter((r) => matchesWhen(r.when, today, k))
  let total = due.length
  const left = due.filter((r) => !done.has(r.id)).map((r) => r.title)
  for (const h of habitsOf(s)) {
    // Gym also shows on a free day to make up a missed one.
    const makeUp = h.type === 'gym' && !dueOn(h, today) && started(h, today) && !!gymMissedDay(s, h, today)
    if (!dueOn(h, today) && !makeUp) continue
    total++
    if (h.type === 'water') {
      const w = waterStats(s, h, today)
      if (w.today < w.target) left.push(`${h.name} ${w.today}/${w.target}`)
    } else {
      // A logged slip (quit smoking, break a habit) is an answer for the day too.
      const v = valueOn(s, h, k)
      if (v !== DONE && v !== SLIP) left.push(h.name)
    }
  }
  return { left, total }
}

export const reminders = { kindAt, wallClock, ownToday }
