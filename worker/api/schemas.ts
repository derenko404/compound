/**
 * The input an AI sends, as zod schemas. They trim and cut text to length, drop values they don't know (a colour
 * or size outside the list) instead of failing, and carry the descriptions shown in MCP tools and OpenAPI.
 */
import { z } from 'zod'
import { PALETTE, PROJECT_SIZES, RESOURCE_KINDS } from '../../core/domain/content'
import type { ProjectSize, ResourceKind } from '../../core/domain/types'

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
  steps: texts().optional(),
  done: text().optional().describe('How to know it is finished.'),
  trains: texts().optional().describe('Skill names it practises.'),
  size: oneOf(PROJECT_SIZES.map((s) => s.value) as [ProjectSize, ...ProjectSize[]]),
})

export const topicFields = z.object({
  name: text(60).optional().describe('Short: it shows on tags and buttons. "English", "System design".'),
  description: text(6000).optional().describe('About: what this topic is, why it matters, how to approach it.'),
  goals: texts().optional().describe('Where the learner will be at the end.'),
  months: z.number().int().positive().optional().catch(undefined).describe('Optional target duration in months.'),
  color: oneOf(PALETTE),
  hint: text(200).optional(),
  skills: z.array(skill).optional(),
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
