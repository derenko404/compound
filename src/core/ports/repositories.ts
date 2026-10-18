/**
 * Storage ports: one repository per kind of data, independent of where it's kept. Adapters implement them over
 * Supabase (adapters/supabase, the app's signed-in client or the worker's service key scoped to one user) or over
 * one JSON blob on the device (adapters/local). Services (core/services) depend only on these interfaces.
 */
import type { DayLog, Habit, ListDef, ListItem, Note, Program, ProjectStatus, Routine, Topic, TopicId } from '../domain/types'

/** A collection of rows kept as whole objects (topics, lists, routines, habits), in their saved order. */
export interface CollectionRepositoryPort<T extends { id: string }> {
  all(): Promise<T[]>
  put(item: T): Promise<void>
  remove(id: string): Promise<void>
}

export type TopicRepositoryPort = CollectionRepositoryPort<Topic>
export type RoutineRepositoryPort = CollectionRepositoryPort<Routine>
export type HabitRepositoryPort = CollectionRepositoryPort<Habit>
// Removing a list also removes its ticks and reviews.
export type ListRepositoryPort = CollectionRepositoryPort<ListDef>

// Ticks on steps and resources: item id → when it was ticked.
export interface TickRepositoryPort {
  all(): Promise<Record<string, string>>
  set(itemId: string, doneAt: string | null): Promise<void>
}

export interface ProjectStatusRepositoryPort {
  all(): Promise<Record<string, ProjectStatus>>
  set(projectId: string, status: ProjectStatus): Promise<void>
}

// Each day's routine ticks and mood, by day key (YYYY-MM-DD).
export interface DayRepositoryPort {
  all(): Promise<Record<string, DayLog>>
  put(day: string, log: DayLog): Promise<void>
}

// Per list, per item: when it was ticked and the user's review. Both empty removes the row.
export interface ListProgressRepositoryPort {
  all(): Promise<Record<string, Record<string, ListItem>>>
  set(listId: string, itemId: string, progress: ListItem): Promise<void>
}

// One number per habit per day. null removes it.
export interface HabitLogRepositoryPort {
  all(): Promise<Record<string, Record<string, number>>>
  set(habitId: string, day: string, value: number | null): Promise<void>
}

export interface SettingsRepositoryPort {
  program(): Promise<Program | undefined>
  setProgram(program: Program | undefined): Promise<void>
}

// What the Notebook asks for. q may hold #tags (matched exactly) and words (matched in the text, AI context and link).
export interface NotesFilter { topic?: TopicId | null; q?: string }

// Notes are read a page at a time, newest first, never all at once with the rest of the data.
export interface NoteRepositoryPort {
  page(f: NotesFilter, offset: number, limit: number): Promise<Note[]>
  // A link is kept once per user: the note already saved for this url, if any.
  byUrl(url: string): Promise<Note | null>
  count(f: NotesFilter): Promise<number>
  put(note: Note): Promise<void>
  remove(id: string): Promise<void>
}

/** Every repository for one user's data, as the bundle services take in their constructors. */
export interface Repositories {
  topics: TopicRepositoryPort
  lists: ListRepositoryPort
  listProgress: ListProgressRepositoryPort
  routines: RoutineRepositoryPort
  habits: HabitRepositoryPort
  habitLogs: HabitLogRepositoryPort
  days: DayRepositoryPort
  ticks: TickRepositoryPort
  projects: ProjectStatusRepositoryPort
  settings: SettingsRepositoryPort
  notes: NoteRepositoryPort
}
