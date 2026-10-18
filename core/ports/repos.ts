// Storage ports: one repository per kind of data, independent of where it's kept. Adapters implement them over
// Supabase (adapters/supabase, the app's signed-in client or the worker's service key scoped to one user) or over
// one JSON blob on the device (adapters/local). Services (core/services) only ever talk to these.
import type { DayLog, Habit, ListDef, ListItem, Note, Program, ProjectStatus, Routine, Topic, TopicId } from '../domain/types'

// A collection of rows kept as whole objects (topics, lists, routines, habits).
export interface Collection<T extends { id: string }> {
  all(): Promise<T[]>
  put(item: T): Promise<void>
  remove(id: string): Promise<void>
}

export type TopicRepo = Collection<Topic>
export type RoutineRepo = Collection<Routine>
export type HabitRepo = Collection<Habit>
// Removing a list also removes its ticks and notes.
export type ListRepo = Collection<ListDef>

// Ticks on steps and resources: item id → when it was ticked.
export interface TickRepo {
  all(): Promise<Record<string, string>>
  set(itemId: string, doneAt: string | null): Promise<void>
}

export interface ProjectStatusRepo {
  all(): Promise<Record<string, ProjectStatus>>
  set(projectId: string, status: ProjectStatus): Promise<void>
}

// Each day's routine ticks and mood, by day key (YYYY-MM-DD).
export interface DayRepo {
  all(): Promise<Record<string, DayLog>>
  put(day: string, log: DayLog): Promise<void>
}

// Per list, per item: when it was ticked and the user's review. Both empty removes the row.
export interface ListProgressRepo {
  all(): Promise<Record<string, Record<string, ListItem>>>
  set(listId: string, itemId: string, progress: ListItem): Promise<void>
}

// One number per habit per day. null removes it.
export interface HabitLogRepo {
  all(): Promise<Record<string, Record<string, number>>>
  set(habitId: string, day: string, value: number | null): Promise<void>
}

export interface SettingsRepo {
  program(): Promise<Program | undefined>
  setProgram(program: Program | undefined): Promise<void>
}

// What the Notebook asks for. q may hold #tags (matched exactly) and words (matched in the text, AI context and link).
export interface NotesFilter { topic?: TopicId | null; q?: string }

// Notes are read a page at a time, newest first, never all at once with the rest of the data.
export interface NoteRepo {
  page(f: NotesFilter, offset: number, limit: number): Promise<Note[]>
  count(f: NotesFilter): Promise<number>
  put(note: Note): Promise<void>
  remove(id: string): Promise<void>
}

// Everything a user's data lives in, as one bundle the services take.
export interface Repos {
  topics: TopicRepo
  lists: ListRepo
  listProgress: ListProgressRepo
  routines: RoutineRepo
  habits: HabitRepo
  habitLogs: HabitLogRepo
  days: DayRepo
  ticks: TickRepo
  projects: ProjectStatusRepo
  settings: SettingsRepo
  notes: NoteRepo
}
