export type ChapterId = 'tech' | 'product' | 'mgmt' | 'biz' | 'eng' | 'money' | 'smoke' | 'gym' | 'own'
export type ListKey = 'books' | 'films' | 'songs' | 'places'
export type ProjectStatus = 'todo' | 'doing' | 'done'
export type Repeat = 'once' | 'daily' | 'weekly'

export interface Quit {
  date: string
  cpd: number
  price: number
}

export interface Settings {
  start_date?: string
  quit?: Quit | null
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

export interface CustomTask {
  id: string
  title: string
  chapter: ChapterId
  repeat: Repeat
  date: string | null
  weekday: number | null
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
  tasks: CustomTask[]
  ideas: Idea[]
  lists: Record<ListKey, Record<number, ListItem>>
  bookmarks: Bookmark[]
}

export const emptyState = (): State => ({
  settings: {},
  days: {},
  plan: {},
  projects: {},
  chapterNotes: {},
  notes: [],
  tasks: [],
  ideas: [],
  lists: { books: {}, films: {}, songs: {}, places: {} },
  bookmarks: [],
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
  | { type: 'addTask'; task: CustomTask }
  | { type: 'deleteTask'; id: string }
  | { type: 'addIdea'; idea: Idea }
  | { type: 'deleteIdea'; id: string }
  | { type: 'addIdeaNote'; note: IdeaNote }
  | { type: 'listItem'; list: ListKey; idx: number; item: ListItem }
  | { type: 'addBookmark'; bookmark: Bookmark }
  | { type: 'deleteBookmark'; id: string }
