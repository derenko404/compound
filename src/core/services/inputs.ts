/**
 * What the services accept to create or change things: the shapes an AI or the bot sends, already trimmed and
 * cut to length by the caller (the worker's zod schemas). Ids are optional: a missing one means a new item.
 */
import type { ProjectSize, ResourceKind, When } from '../domain/types'

export interface StepInput { id?: string; text: string }
export interface SkillInput { id?: string; name: string; intro?: string; steps?: (string | StepInput)[] }
export interface ResourceInput { id?: string; title: string; url?: string; kind?: ResourceKind; note?: string; free?: boolean }
export interface ProjectInput {
  id?: string; code?: string; name: string; goal?: string; steps?: string[]; done?: string; trains?: string[]; size?: ProjectSize
}

export interface TopicInput {
  name?: string
  description?: string
  goals?: string[]
  months?: number
  color?: string
  hint?: string
  skills?: SkillInput[]
  resources?: ResourceInput[]
  projects?: ProjectInput[]
}

export interface ListItemInput { id?: string; title: string; detail?: string }
export interface ListInput { name?: string; title?: string; detail_label?: string; items?: ListItemInput[] }

export interface RoutineInput { title: string; details?: string; topic?: string; when?: When; counts_for_streak?: boolean }

export interface NoteInput { text?: string; url?: string; tags?: string[]; topic?: string }
