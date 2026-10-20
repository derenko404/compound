/**
 * The input an AI sends, as zod schemas. They trim and cut text to length, drop values they don't know (a colour
 * or size outside the list) instead of failing, and carry the descriptions shown in MCP tools and OpenAPI.
 */
import { z } from 'zod'
import { PALETTE, PROJECT_SIZES, RESOURCE_KINDS } from '../../core/domain/content'
import type { ProjectSize, ResourceKind, When } from '../../core/domain/types'

export const text = (max = 2000) => z.string().transform((s) => s.trim().slice(0, max))
const texts = (max = 400) => z.array(text(max)).transform((xs) => xs.filter(Boolean))
// A value from a fixed set, or nothing when it's not one of them.
const oneOf = <T extends string>(values: readonly [T, ...T[]]) => z.enum(values).optional().catch(undefined)

export const idParams = z.object({ id: z.string().min(1).describe('The id, as returned by a list call.') })

const step = z.union([text(400), z.object({ id: z.string().optional(), text: text(400) })])

const skill = z.object({
  id: z.string().optional().describe('Keep an existing skill\'s id when updating, so its ticks stay.'),
  name: text(200),
  intro: text().optional().describe('What the skill is and why it matters, 1–2 sentences.'),
  steps: z.array(step).optional().describe('What to learn, in order. Short, concrete steps.'),
})

const resource = z.object({
  id: z.string().optional(),
  title: text(300),
  url: text(1000).optional(),
  kind: oneOf(RESOURCE_KINDS.map((k) => k.id) as [ResourceKind, ...ResourceKind[]]),
  note: text().optional().describe('Why it is worth it, one line.'),
  free: z.boolean().optional(),
})

const project = z.object({
  id: z.string().optional(),
  code: text(12).optional(),
  name: text(300),
  goal: text().optional(),
  steps: z.array(step).optional().describe('What to do, in order. Tickable: keep ids when updating.'),
  done: text().optional().describe('How to know it is finished.'),
  trains: texts().optional().describe('Skill names it practises.'),
  size: oneOf(PROJECT_SIZES.map((s) => s.value) as [ProjectSize, ...ProjectSize[]]),
})

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

const task = z.object({
  id: z.string().optional(),
  title: text(200),
  details: text(400).optional(),
  when: when.optional().describe('When it is due. Daily if left out. ' + when.description),
})

export const topicFields = z.object({
  name: text(60).optional().describe('Short: it shows on tags and buttons. "English", "System design".'),
  description: text(6000).optional().describe('About: what this topic is, why it matters, how to approach it.'),
  goals: texts().optional().describe('Where the learner will be at the end.'),
  months: z.number().int().positive().optional().catch(undefined).describe('Optional target duration in months.'),
  color: oneOf(PALETTE),
  hint: text(200).optional(),
  skills: z.array(skill).optional(),
  tasks: z.array(task).optional().describe('Regular practice for the topic, shown on Today when due: "Speak for 10 minutes", daily. 1–3 per topic, only ones the user asked for or clearly wants.'),
  resources: z.array(resource).optional(),
  projects: z.array(project).optional(),
})

const item = z.object({
  id: z.string().optional(),
  title: text(300),
  detail: text(200).optional().describe('The small line under it: author, year, artist, country…'),
})

export const listFields = z.object({
  name: text(60).optional().describe('Short, may start with an emoji: "🎬 Films".'),
  title: text(200).optional().describe('"100 films everyone should watch".'),
  detail_label: text(40).optional().describe('What the detail line is: "Year", "Author".'),
  items: z.array(item).optional(),
})
