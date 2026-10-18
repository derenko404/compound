// Chapter ids are free text: the seeded ones ('tech', 'eng', 'smoke', …) plus ids made for new chapters.
export type ChapterId = string
export type ProjectStatus = 'todo' | 'doing' | 'done'

/* ---------- Content: everything the user can edit ---------- */

export type ChapterKind = 'learn' | 'health' | 'general'
export type ResourceKind = 'book' | 'course' | 'video' | 'article' | 'podcast' | 'tool' | 'doc' | 'practice' | 'other'

export interface PlanTask {
  id: string
  text: string
  // Program months (0-based, inclusive) the task belongs to.
  from: number
  to: number
}

export interface Project {
  id: string
  code: string // short code like T1; text that mentions it links to the project
  name: string
  goal?: string
  steps?: string[]
  done?: string
  trains?: string
  size?: string
}

export interface Resource {
  id: string
  title: string
  url?: string
  kind: ResourceKind
  note?: string
  free?: boolean
  topic?: string
}

export interface ChecklistItem { id: string; text: string }
export interface Checklist { id: string; title: string; items: ChecklistItem[] }

export interface Milestone { mins: number; label: string; text: string }
export interface Workout { name: string; text: string }

// Optional trackers a chapter (usually a health one) can switch on.
export interface Components {
  quit?: {
    date?: string | null // set when started
    per_day: number
    price: number // per pack of 20
    unit: string // "cigarettes"
    milestones: Milestone[]
    tips: string[] // rotate under the daily check on Today
    check_id: string // id ticked on Today for a clean day
    check_title: string // "Smoke-free today"
  }
  workout?: {
    start?: string | null
    days: number[] // weekdays, 0 = Sunday
    workouts: Workout[] // alternate in order
    check_id: string
  }
  weight?: { unit: string }
}

export interface Chapter {
  id: ChapterId
  kind: ChapterKind
  position: number
  name: string // one name everywhere: tags, cards, headers, the bot
  color: string // palette key, see PALETTE in content.ts
  description?: string
  start: number // program month the chapter starts (0-based)
  months: number // duration
  outcomes: string[]
  skills: string[]
  tasks: PlanTask[]
  projects: Project[]
  resources: Resource[]
  checklists: Checklist[]
  tips: string[]
  hint?: string // what belongs here, for the Telegram bot's AI
  components?: Components
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

// Fills the routine's subtitle from the plan: the focus chapter's task, a rotating other chapter, the quarter project.
export type Fill = 'focus' | 'light' | 'project'

export interface Routine {
  id: string
  position: number
  title: string
  sub?: string
  chapter: ChapterId
  when: When
  fill?: Fill
  core?: boolean // counts for the streak
  created_at: string
}

export interface QuarterPlan { focus: ChapterId | null; project: string }

export interface Program {
  seeded?: number // seed version applied
  months: number
  motivation?: string // why you're doing the program; shown folded under the Plan title
  quarters: QuarterPlan[]
}

/* ---------- Progress and records ---------- */

export interface Settings {
  start_date?: string
  program?: Program
  // Before chapters were editable; the seed moves these into the smoke and gym chapters.
  quit?: { date: string; cpd: number; price: number } | null
  gym_start?: string | null
}

export interface DayLog {
  done: string[]
  log?: string | null
  weight?: number | null
  smoke?: 'free' | 'slip' | null
}

export interface Note {
  id: string
  chapter: ChapterId
  body: string
  created_at: string
}

export interface IdeaNote {
  id: string
  idea_id: string
  body: string
  created_at: string
}

export interface Idea {
  id: string
  title: string
  body: string
  labels: string[]
  created_at: string
  notes: IdeaNote[]
}

export type BookmarkKind = 'video' | 'post' | 'site'

export interface Bookmark {
  id: string
  url: string
  kind: BookmarkKind
  title: string
  description: string
  tags: string[]
  note: string
  chapter: ChapterId | null
  source: 'app' | 'telegram'
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
  chapterNotes: Record<string, string>
  notes: Note[]
  ideas: Idea[]
  bookmarks: Bookmark[]
  chapters: Chapter[]
  lists: ListDef[]
  listProgress: Record<string, Record<string, ListItem>>
  routines: Routine[]
}

export const emptyState = (): State => ({
  settings: {},
  days: {},
  plan: {},
  projects: {},
  chapterNotes: {},
  notes: [],
  ideas: [],
  bookmarks: [],
  chapters: [],
  lists: [],
  listProgress: {},
  routines: [],
})

// Every change to the data goes through one of these, so the reducer and the
// storage backends stay in step.
export type Op =
  | { type: 'settings'; patch: Settings }
  | { type: 'day'; day: string; log: DayLog }
  | { type: 'plan'; taskId: string; doneAt: string | null }
  | { type: 'project'; projectId: string; status: ProjectStatus }
  | { type: 'chapterNote'; chapter: string; body: string }
  | { type: 'addNote'; note: Note }
  | { type: 'deleteNote'; id: string }
  | { type: 'addIdea'; idea: Idea }
  | { type: 'deleteIdea'; id: string }
  | { type: 'addIdeaNote'; note: IdeaNote }
  | { type: 'addBookmark'; bookmark: Bookmark }
  | { type: 'deleteBookmark'; id: string }
  | { type: 'putChapter'; chapter: Chapter }
  | { type: 'deleteChapter'; id: string }
  | { type: 'putList'; list: ListDef }
  | { type: 'deleteList'; id: string }
  | { type: 'listItem'; list: string; item: string; progress: ListItem }
  | { type: 'putRoutine'; routine: Routine }
  | { type: 'deleteRoutine'; id: string }
  | { type: 'batch'; ops: Op[] }
