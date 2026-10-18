// The storage ports on this device only: the whole state (notes included) as one JSON blob in localStorage, for
// people who use the app without an account. Each write updates the blob. The key keeps the old `roadmap-` prefix:
// renaming it would hide existing device data.
import { emptyState, type State } from '../../core/domain/types'
import { normalizeState } from '../../core/domain/content'
import { parseNoteQuery } from '../../core/domain/notes'
import type { Collection, Repos } from '../../core/ports/repos'

export const LOCAL_KEY = 'roadmap-log-v2'

export function readLocal(): State {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    return raw ? { ...emptyState(), ...JSON.parse(raw) } : emptyState()
  } catch {
    return emptyState()
  }
}
export const clearLocal = () => localStorage.removeItem(LOCAL_KEY)

export function localRepos(): Repos {
  // Read, change and write back the blob.
  const edit = async (f: (s: State) => void) => {
    const s = readLocal()
    f(s)
    localStorage.setItem(LOCAL_KEY, JSON.stringify(s))
  }
  const collection = <K extends 'topics' | 'lists' | 'routines' | 'habits'>(key: K): Collection<State[K][number]> => ({
    async all() {
      return readLocal()[key]
    },
    put: (item) => edit((s) => {
      const xs = s[key] as { id: string }[]
      const i = xs.findIndex((x) => x.id === item.id)
      if (i < 0) xs.push(item)
      else xs[i] = item
    }),
    remove: (id) => edit((s) => {
      ;(s[key] as { id: string }[]) = (s[key] as { id: string }[]).filter((x) => x.id !== id)
      if (key === 'lists') delete s.listProgress[id]
    }),
  })
  const notes = () => normalizeState(readLocal()).notes

  return {
    topics: collection('topics'),
    lists: collection('lists'),
    routines: collection('routines'),
    habits: collection('habits'),
    habitLogs: {
      all: async () => readLocal().habitLogs,
      set: (habitId, day, value) => edit((s) => {
        const log = (s.habitLogs[habitId] ??= {})
        if (value == null) delete log[day]
        else log[day] = value
      }),
    },
    listProgress: {
      all: async () => readLocal().listProgress,
      set: (listId, itemId, p) => edit((s) => {
        const list = (s.listProgress[listId] ??= {})
        if (p.done_at || p.note) list[itemId] = p
        else delete list[itemId]
      }),
    },
    days: {
      all: async () => readLocal().days,
      put: (day, log) => edit((s) => { s.days[day] = log }),
    },
    ticks: {
      all: async () => readLocal().plan,
      set: (itemId, doneAt) => edit((s) => {
        if (doneAt) s.plan[itemId] = doneAt
        else delete s.plan[itemId]
      }),
    },
    projects: {
      all: async () => readLocal().projects,
      set: (projectId, status) => edit((s) => { s.projects[projectId] = status }),
    },
    settings: {
      program: async () => readLocal().settings.program,
      setProgram: (program) => edit((s) => { s.settings = { ...s.settings, program } }),
    },
    notes: {
      async page(f, offset, limit) {
        const { tags, text } = parseNoteQuery(f.q)
        return notes()
          .filter((n) => (!f.topic || n.topic === f.topic) && tags.every((t) => n.tags.includes(t))
            && text.every((w) => [n.body, n.context, n.url ?? ''].join(' ').toLowerCase().includes(w)))
          .sort((a, b) => b.created_at.localeCompare(a.created_at))
          .slice(offset, offset + limit)
      },
      async count(f) {
        return (await this.page(f, 0, Infinity)).length
      },
      put: (note) => edit((s) => {
        const i = s.notes.findIndex((n) => n.id === note.id)
        if (i < 0) s.notes.push(note)
        else s.notes[i] = note
      }),
      remove: (id) => edit((s) => { s.notes = s.notes.filter((n) => n.id !== id) }),
    },
  }
}
