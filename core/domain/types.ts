// Topic ids are free text: the seeded ones ('tech', 'eng', 'smoke', …) plus ids made for new topics.
export type TopicId = string
export type ProjectStatus = 'todo' | 'doing' | 'done'

/* ---------- Content: everything the user can edit ---------- */

export type TopicKind = 'learn' | 'general'
export type ResourceKind = 'book' | 'course' | 'video' | 'article' | 'podcast' | 'tool' | 'doc' | 'practice' | 'other'

export type ProjectSize = 'small' | 'medium' | 'big'

export interface Project {
  id: string
  code: string // short code like T1; text that mentions it links to the project
  name: string
  goal?: string
  steps?: string[]
  done?: string
  trains?: string[] // skills the project practises
  size?: ProjectSize
}

export interface Resource {
  id: string
  title: string
  url?: string
  kind: ResourceKind
  note?: string
  free?: boolean
}

export interface Step { id: string; text: string }
// What to learn: a skill with its steps in order, each tickable. Resources are a separate list on the topic.
export interface Skill { id: string; name: string; intro?: string; steps: Step[] }

export interface Milestone { mins: number; label: string; text: string }

export interface Topic {
  id: TopicId
  kind: TopicKind
  position: number
  name: string // one name everywhere: tags, cards, headers, the bot
  color: string // palette key, see PALETTE in content.ts
  description?: string
  outcomes: string[] // "where you'll be": plain text goals
  created_at?: string // ISO; the duration counts from here
  months?: number // optional duration from created_at; the target finish is worked out from it, and pace warns when it would land later
  /**
   * The topic is its skills in order: "next" is always the first unticked step. No dates inside a topic;
   * the focus (heavy) topic is Program.focus.
   */
  projects: Project[] // in order: the weekend slot takes the first unfinished one
  resources: Resource[]
  skills: Skill[]
  hint?: string // what belongs here, for the Telegram bot's AI
  archived?: boolean
}

export interface ListDefItem { id: string; title: string; sub?: string }
export interface ListDef {
  id: string
  position: number
  name: string
  title: string
  sub_label: string
  items: ListDefItem[]
}

export type When =
  | { kind: 'daily' }
  | { kind: 'weekly'; days: number[] }
  | { kind: 'monthly'; day: number } // 1–31, or -1 for the last day
  | { kind: 'once'; date: string }


export interface Routine {
  id: string
  position: number
  title: string
  sub?: string
  topic: TopicId
  when: When
  core?: boolean // counts for the streak
  created_at: string
}

// Stored in settings.program.
export interface Program {
  seeded?: number // seed version applied
  focus: TopicId | null // the heavy topic: it gets the study sessions and the weekend project
}

/* ---------- Progress and records ---------- */

export interface Settings {
  program?: Program
}

export interface DayLog {
  done: string[]
  mood?: number | null // 1 (awful) to 5 (great), set on Wellbeing
}

/* ---------- Wellbeing habits ---------- */

// Each type is a skin over the same habit: the shape below is shared, the widget, Today row and texts differ.
export type HabitType = 'gym' | 'water' | 'smoking' | 'build' | 'break'

// What only some types use (table column custom_data).
export interface HabitData {
  per_day?: number // smoking: cigarettes a day before quitting
  price?: number // smoking: price of a pack of 20
  target?: number // water: glasses a day; build: days in the challenge (21)
}

// Field names match the table's columns.
export interface Habit {
  id: string
  type: HabitType
  name: string
  why: string | null // the user's reason, one line
  start_date: string | null // quit day, day 1 of a new habit, first gym week; null = not started
  days: number[] // weekdays it's due, 0 = Sunday; empty = every day
  position: number
  custom_data: HabitData
  created_at: string
}

export type LinkKind = 'video' | 'post' | 'site'

export type NoteType = 'note' | 'idea' | 'link'

// One Notebook entry, of one of three types: a note (text), an idea (title and details) or a link (url, page title, why).
export interface Note {
  id: string
  type: NoteType
  body: string // the note or idea itself, or why the link is interesting
  url: string | null // unique per user
  kind: LinkKind | null // links only
  context: string // written by the AI only (the bot): a link's page title and summary, and the like; read-only in the app
  tags: string[]
  topic: TopicId | null
  source: 'app' | 'telegram' | 'api'
  created_at: string
}

export interface ListItem {
  done_at?: string | null
  note?: string | null
}

export interface State {
  settings: Settings
  days: Record<string, DayLog>
  plan: Record<string, string>
  projects: Record<string, ProjectStatus>
  notes: Note[]
  topics: Topic[]
  lists: ListDef[]
  listProgress: Record<string, Record<string, ListItem>>
  routines: Routine[]
  habits: Habit[]
  // habit id → day key → value: 1 = done or a clean day, -1 = a slip, a count for water
  habitLogs: Record<string, Record<string, number>>
}

export const emptyState = (): State => ({
  settings: {},
  days: {},
  plan: {},
  projects: {},
  notes: [],
  topics: [],
  lists: [],
  listProgress: {},
  routines: [],
  habits: [],
  habitLogs: {},
})

/**
 * Every change to the data goes through one of these, so the reducer and the
 * storage backends stay in step.
 */
export type Op =
  | { type: 'settings'; patch: Settings }
  | { type: 'day'; day: string; log: DayLog }
  | { type: 'plan'; taskId: string; doneAt: string | null }
  | { type: 'project'; projectId: string; status: ProjectStatus }
  | { type: 'putNote'; note: Note }
  | { type: 'deleteNote'; id: string }
  | { type: 'putTopic'; topic: Topic }
  | { type: 'deleteTopic'; id: string }
  | { type: 'putList'; list: ListDef }
  | { type: 'deleteList'; id: string }
  | { type: 'listItem'; list: string; item: string; progress: ListItem }
  | { type: 'putRoutine'; routine: Routine }
  | { type: 'deleteRoutine'; id: string }
  | { type: 'putHabit'; habit: Habit }
  | { type: 'deleteHabit'; id: string }
  | { type: 'habitLog'; habit: string; day: string; value: number | null }
  | { type: 'batch'; ops: Op[] }
