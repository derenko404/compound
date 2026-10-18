import type { Note } from '../../core/domain/types'
import { normalizeState } from '../../core/domain/content'
import { noteSearch } from '../../core/domain/notes'
import type { NoteRepositoryPort, NotesFilter } from '../../core/ports/repositories'
import type { LocalStore } from './local-store'

/** Notebook entries inside the device's blob, filtered and paged in memory. */
export class LocalNoteRepository implements NoteRepositoryPort {
  private readonly store: LocalStore

  constructor(store: LocalStore) {
    this.store = store
  }

  async page(f: NotesFilter, offset: number, limit: number) {
    const { tags, text } = noteSearch.parse(f.q)
    return this.notes()
      .filter((n) => (!f.topic || n.topic === f.topic) && tags.every((t) => n.tags.includes(t))
        && text.every((w) => [n.body, n.context, n.url ?? ''].join(' ').toLowerCase().includes(w)))
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(offset, offset + limit)
  }

  async byUrl(url: string) {
    return this.notes().find((n) => n.url === url) ?? null
  }

  async count(f: NotesFilter) {
    return (await this.page(f, 0, Infinity)).length
  }

  put(note: Note) {
    return this.store.edit((s) => {
      const i = s.notes.findIndex((n) => n.id === note.id)
      if (i < 0) s.notes.push(note)
      else s.notes[i] = note
    })
  }

  remove(id: string) {
    return this.store.edit((s) => { s.notes = s.notes.filter((n) => n.id !== id) })
  }

  private notes() {
    return normalizeState(this.store.read()).notes
  }
}
