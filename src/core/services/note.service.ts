import { FALLBACK_TOPIC } from '../domain/content'
import { fail } from '../domain/errors'
import { cleanTag, findUrls, kindFromUrl } from '../domain/finds'
import type { Note } from '../domain/types'
import type { Repositories } from '../ports/repositories'
import type { NoteInput } from './inputs'

/**
 * Notebook entries saved from outside the app (AI, API, Telegram). A link is kept once per user: saving the same
 * url again updates that entry. The tag "idea" makes a note an idea.
 */
export class NoteService {
  private readonly repos: Repositories

  constructor(repos: Repositories) {
    this.repos = repos
  }

  // Newest first. `query` takes words and #tags, like the Notebook's search.
  list(f: { query?: string; topic?: string; limit?: number } = {}) {
    return this.repos.notes.page({ q: f.query, topic: f.topic }, 0, Math.min(f.limit || 20, 100))
  }

  async add(input: NoteInput, source: Note['source'] = 'api', extra: Partial<Pick<Note, 'context' | 'kind' | 'type'>> = {}): Promise<Note> {
    const body = input.text ?? ''
    const url = input.url || findUrls(body)[0] || null
    if (!body && !url) fail(400, 'A note needs text or a url.')
    const topics = await this.repos.topics.all()
    const tags = [...new Set((input.tags ?? []).map(cleanTag).filter(Boolean))]
    const old = url ? await this.repos.notes.byUrl(url) : null
    const note: Note = {
      id: old?.id ?? crypto.randomUUID(), created_at: old?.created_at ?? new Date().toISOString(),
      type: url ? 'link' : tags.includes('idea') ? 'idea' : 'note', body, url,
      kind: url ? kindFromUrl(url) ?? 'site' : null, context: old?.context ?? '',
      tags, topic: topics.some((t) => t.id === input.topic) ? input.topic! : FALLBACK_TOPIC, source,
      ...extra,
    }
    await this.repos.notes.put(note)
    return note
  }
}
