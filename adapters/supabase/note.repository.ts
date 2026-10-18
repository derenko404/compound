import type { Note } from '../../core/domain/types'
import { parseNoteQuery } from '../../core/domain/notes'
import type { NoteRepositoryPort, NotesFilter } from '../../core/ports/repositories'
import { SupabaseTable, type Query, type Row } from './supabase-table'

/** Notebook entries, read a page at a time and searched in the database. */
export class SupabaseNoteRepository extends SupabaseTable implements NoteRepositoryPort {
  protected readonly table = 'notes'

  async page(f: NotesFilter, offset: number, limit: number) {
    const q = this.filter(this.own(this.from().select('*')), f).order('created_at', { ascending: false }).range(offset, offset + limit - 1)
    return (await this.rows(q)).map((n: Row) => this.toNote(n))
  }

  async byUrl(url: string) {
    const n = this.check(await this.own(this.from().select('*').eq('url', url)).maybeSingle()).data as Row
    return n ? this.toNote(n) : null
  }

  async count(f: NotesFilter) {
    return this.check(await this.filter(this.own(this.from().select('id', { count: 'exact', head: true })), f)).count ?? 0
  }

  async put(note: Note) {
    this.check(await this.from().upsert(this.mine(note)))
  }

  async remove(id: string) {
    this.check(await this.own(this.from().delete().eq('id', id)))
  }

  // The Notebook's filters as a Supabase query.
  private filter(q: Query, f: NotesFilter): Query {
    const { tags, text } = parseNoteQuery(f.q)
    if (f.topic) q = q.eq('topic', f.topic)
    if (tags.length) q = q.contains('tags', tags)
    // PostgREST's or() takes a comma list, so commas and brackets are dropped from search words.
    for (const w of text.map((x) => x.replace(/[,()%*]/g, '')).filter(Boolean))
      q = q.or(`body.ilike.%${w}%,context.ilike.%${w}%,url.ilike.%${w}%`)
    return q
  }

  private toNote(n: Row): Note {
    return {
      id: n.id, type: n.type, body: n.body, url: n.url, kind: n.kind, context: n.context, tags: n.tags,
      topic: n.topic, source: n.source, created_at: n.created_at,
    }
  }
}
