import { links } from '../domain/links'
import type { LinkKind, TopicId } from '../domain/types'
import type { AiMessage, AiPort } from '../ports/ai'
import type { PageMeta } from '../ports/page-reader'

/** A topic as the AI sees it when filing: its id, name and what belongs in it. */
export interface FilingTopic { id: TopicId; name: string; hint: string }

/**
 * The AI's part in the notebook: filing a note or a link under a topic with a few tags, spotting ideas,
 * summing up a page, and answering a question. Failures never throw: filing falls back to no topic and no tags.
 */
export class NoteFilerService {
  private readonly ai: AiPort

  constructor(ai: AiPort) {
    this.ai = ai
  }

  // A note: its topic, up to three tags, and whether it's an idea.
  async fileNote(body: string, topics: FilingTopic[]): Promise<{ topic: FilingTopic | null; tags: string[]; idea: boolean }> {
    try {
      const j = await this.json(80, {
        type: 'object',
        properties: { topic: { type: 'string', enum: topics.map((c) => c.id) }, tags: { type: 'array', items: { type: 'string' }, maxItems: 3 }, idea: { type: 'boolean' } },
        required: ['topic', 'tags', 'idea'],
      }, [
        {
          role: 'system',
          content:
            'You file a personal note in a self-development notebook. Reply with JSON: {"topic": "<id>", "tags": [1 to 3 short lowercase subject words], "idea": true | false}. ' +
            'idea = true only when the note proposes something to build, start or try (a product, project, plan or experiment), not for facts, learnings, reminders or questions. ' +
            `topic = the part of the roadmap it belongs to:\n${this.list(topics)}`,
        },
        { role: 'user', content: body },
      ])
      return { topic: this.topicIn(topics, j.topic), tags: this.tags(j.tags).filter((t) => t !== 'idea'), idea: j.idea === true }
    } catch (e) {
      console.error('ai', e)
      return { topic: null, tags: [], idea: false }
    }
  }

  // A link: its kind (video, post or site), up to three tags, and its topic.
  async classifyLink(url: string, meta: PageMeta, topics: FilingTopic[]): Promise<{ kind: LinkKind | null; tags: string[]; topic: TopicId | null }> {
    try {
      const j = await this.json(120, {
        type: 'object',
        properties: {
          kind: { type: 'string', enum: ['video', 'post', 'site'] },
          tags: { type: 'array', items: { type: 'string' }, maxItems: 3 },
          topic: { type: 'string', enum: topics.map((c) => c.id) },
        },
        required: ['kind', 'tags', 'topic'],
      }, [
        {
          role: 'system',
          content:
            'You file links into a personal bookmark list. Reply with JSON: {"kind": "video" | "post" | "site", "tags": [1 to 3 short lowercase subject words], "topic": "<id>"}. ' +
            'video = a video or talk to watch; post = one article, blog post, thread or social post; site = a whole site, tool, product, course or docs. ' +
            `topic = the part of the owner's self-development roadmap it helps with:\n${this.list(topics)}`,
        },
        { role: 'user', content: `URL: ${url}\nTitle: ${meta.title}\nDescription: ${meta.description}` },
      ])
      const kind = j.kind === 'video' || j.kind === 'post' || j.kind === 'site' ? j.kind : null
      return { kind, tags: this.tags(j.tags), topic: this.topicIn(topics, j.topic)?.id ?? null }
    } catch (e) {
      console.error('ai', e)
      return { kind: null, tags: [], topic: null }
    }
  }

  // What a page says and whether it's worth the time, answering the question first if there is one.
  summarize(url: string, meta: PageMeta, question: string) {
    const source = meta.text ? `Page text:\n${meta.text}` : 'Only the title and description are available (no page text or transcript); say so briefly.'
    return this.chat(500, [
      {
        role: 'system',
        content:
          'You help a software engineer decide what to read or watch. Plain text, no markdown. ' +
          'If they ask a question, answer it first. Then 3 to 5 short points starting with "• " on what it says, ' +
          'and a last line "Worth it: …" on who it is for and whether it is worth the time.',
      },
      { role: 'user', content: `URL: ${url}\nTitle: ${meta.title}\nDescription: ${meta.description}\n${source}${question ? `\n\nMy question: ${question}` : ''}` },
    ])
  }

  ask(question: string) {
    return this.chat(700, [
      { role: 'system', content: 'You are a concise assistant for a software engineer working on a self-development roadmap. Plain text, no markdown.' },
      { role: 'user', content: question },
    ])
  }

  private async chat(maxTokens: number, messages: AiMessage[]) {
    try {
      return (await this.ai.complete({ maxTokens, messages })).trim().slice(0, 3500) || 'The AI had nothing to say. Try again.'
    } catch (e) {
      console.error('ai', e)
      return "Couldn't reach the AI. Try again in a minute."
    }
  }

  private async json(maxTokens: number, jsonSchema: object, messages: AiMessage[]) {
    const reply = await this.ai.complete({ maxTokens, messages, jsonSchema })
    return JSON.parse(reply.match(/\{[\s\S]*\}/)?.[0] ?? '{}') as { topic?: string; tags?: unknown; idea?: unknown; kind?: string }
  }

  private list(topics: FilingTopic[]) {
    return topics.map((c) => `${c.id} = ${c.name}${c.hint ? `: ${c.hint}` : ''}`).join('\n')
  }

  private topicIn(topics: FilingTopic[], id: unknown) {
    return topics.find((c) => c.id === id) ?? null
  }

  private tags(x: unknown) {
    return Array.isArray(x) ? [...new Set(x.filter((t): t is string => typeof t === 'string').map(links.cleanTag).filter(Boolean))].slice(0, 3) : []
  }
}
