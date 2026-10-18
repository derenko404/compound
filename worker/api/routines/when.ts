import { z } from 'zod'
import type { When } from '../../../core/domain/types'

const DAY = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

/**
 * When a routine is due, in the loose forms an AI sends: "daily", { kind: "weekly", days: ["mon", "wed"] },
 * { kind: "monthly", day: 1 } (or -1 for the last day) or { kind: "once", date: "YYYY-MM-DD" }. Anything else
 * becomes daily.
 */
export const when = z.unknown().transform((x, ctx): When => {
  const w = x as { kind?: string; days?: unknown[]; day?: number; date?: string } | string | undefined
  if (w === 'daily' || (typeof w === 'object' && w?.kind === 'daily')) return { kind: 'daily' }
  if (typeof w !== 'object' || !w) return { kind: 'daily' }
  if (w.kind === 'weekly') {
    const days = (w.days ?? []).map((d) => (typeof d === 'number' ? d : DAY.indexOf(String(d).slice(0, 3).toLowerCase()))).filter((d) => d >= 0 && d <= 6)
    if (days.length) return { kind: 'weekly', days: [...new Set(days)].sort() }
    ctx.addIssue({ code: 'custom', message: 'A weekly routine needs days.' })
    return z.NEVER
  }
  if (w.kind === 'monthly') return { kind: 'monthly', day: w.day === -1 || (Number.isInteger(w.day) && w.day! >= 1 && w.day! <= 31) ? w.day! : 1 }
  if (w.kind === 'once' && /^\d{4}-\d{2}-\d{2}$/.test(w.date ?? '')) return { kind: 'once', date: w.date! }
  return { kind: 'daily' }
}).describe('"daily", { kind: "weekly", days: ["mon","wed"] }, { kind: "monthly", day: 1 (or -1 for the last day) } or { kind: "once", date: "YYYY-MM-DD" }.')
