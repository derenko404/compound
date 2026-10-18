import { FALLBACK_TOPIC } from '../domain/content'
import { fail } from '../domain/errors'
import { links } from '../domain/links'
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
    const url = input.url || links.findUrls(body)[0] || null
    if (!body && !url) fail(400, 'A note needs text or a url.')
    const topics = await this.repos.topics.all()
    const tags = [...new Set((input.tags ?? []).map(links.cleanTag).filter(Boolean))]
    const old = url ? await this.repos.notes.byUrl(url) : null
    const note: Note = {
      id: old?.id ?? crypto.randomUUID(), created_at: old?.created_at ?? new Date().toISOString(),
      type: url ? 'link' : tags.includes('idea') ? 'idea' : 'note', body, url,
      kind: url ? links.kindFromUrl(url) ?? 'site' : null, context: old?.context ?? '',
      tags, topic: topics.some((t) => t.id === input.topic) ? input.topic! : FALLBACK_TOPIC, source,
      ...extra,
    }
    await this.repos.notes.put(note)
    return note
  }

  /**
   * Saves a link with what the bot learned about it. Resending a link updates its details and keeps its old text
   * unless new text came with it.
   */
  async saveLink(link: { url: string; kind: Note['kind']; context: string; tags: string[]; topic: string | null; body?: string }, source: Note['source']): Promise<Note> {
    const old = await this.repos.notes.byUrl(link.url)
    const note: Note = {
      id: old?.id ?? crypto.randomUUID(), created_at: old?.created_at ?? new Date().toISOString(),
      type: 'link', url: link.url, kind: link.kind, context: link.context, tags: link.tags,
      topic: link.topic ?? FALLBACK_TOPIC, body: link.body || old?.body || '', source,
    }
    await this.repos.notes.put(note)
    return note
  }

  // Adds text to a saved link's note, on a new line. False when the link isn't in the notebook.
  async appendToLink(url: string, text: string): Promise<boolean> {
    const old = await this.repos.notes.byUrl(url)
    if (!old) return false
    await this.repos.notes.put({ ...old, body: old.body ? `${old.body}\n${text}` : text })
    return true
  }
}
