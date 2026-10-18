import { FALLBACK_TOPIC } from '../domain/content'
import { cleanTag, findUrls, kindFromUrl } from '../domain/finds'
import type { Repositories } from '../ports/repositories'
import type { PageReaderPort } from '../ports/page-reader'
import type { TelegramLinkRepositoryPort } from '../ports/telegram'
import { NoteFilerService, type FilingTopic } from './note-filer.service'
import { NoteService } from './note.service'

/**
 * A message as the bot sees it: its text, the links hidden behind text in it (Telegram text links), and every link
 * in the message it replies to.
 */
export interface BotMessage {
  chatId: number
  username: string | null
  text: string
  textLinks: string[]
  replyLinks: string[]
}

const HELP = [
  'Send me a link, with a note if you like, and I\'ll save it to your notebook. Reply to a link later to add a note to it.',
  'Any other text is saved as a note. Start it with a topic to pick one, e.g. "english practise th sounds"; otherwise the AI picks. The AI also adds tags and spots ideas (or add #idea); #tags you type are kept too.',
  '/ai <link> [question] reads the page, sums it up and saves it to your notebook. /ai <question> just asks the AI.',
].join('\n\n')
const NOT_LINKED = 'Open Compound, then Settings → Connect Telegram, to link this chat to your account.'
// A new account always has Personal, so this only covers an account that hasn't opened the app yet.
const FALLBACK: FilingTopic[] = [{ id: FALLBACK_TOPIC, name: 'Personal', hint: 'anything personal' }]
const CODE_TTL_MS = 15 * 60_000

/**
 * What the Telegram bot does with a message, as the text to reply with:
 * - /start <code> links the chat to an account (from Settings → Connect Telegram);
 * - a link (with optional text) is saved to the notebook, filed by the AI; /ai <link> also sums it up;
 * - a reply to a message with a link adds its text to that link's note;
 * - other text is saved as a note (the first word may name the topic); /ai <question> just asks the AI.
 */
export class TelegramBotService {
  private readonly links: TelegramLinkRepositoryPort
  private readonly pages: PageReaderPort
  private readonly filer: NoteFilerService
  private readonly reposFor: (userId: string) => Repositories

  constructor(deps: { links: TelegramLinkRepositoryPort; pages: PageReaderPort; filer: NoteFilerService; reposFor: (userId: string) => Repositories }) {
    this.links = deps.links
    this.pages = deps.pages
    this.filer = deps.filer
    this.reposFor = deps.reposFor
  }

  async handle(m: BotMessage): Promise<string> {
    const start = m.text.match(/^\/start(?:@\w+)?(?:\s+([\w-]+))?/)
    if (start?.[1]) return this.connect(m, start[1])
    const user = await this.links.userForChat(m.chatId)
    if (!user) return NOT_LINKED
    const repos = this.reposFor(user)
    const notes = new NoteService(repos)

    const cmd = m.text.match(/^\/(\w+)(?:@\w+)?\s*([\s\S]*)$/)
    const isAi = cmd?.[1].toLowerCase() === 'ai'
    if (cmd && !isAi) return HELP
    const rest = isAi ? cmd[2] : m.text
    const urls = [...new Set([...findUrls(rest), ...m.textLinks])]

    if (!cmd && !urls.length && m.replyLinks.length && m.text.trim()) return this.noteOnLinks(notes, m.replyLinks, m.text.trim())
    if (!urls.length) {
      if (isAi) return rest.trim() ? this.filer.ask(rest.trim()) : HELP
      return m.text.trim() ? this.saveNote(repos, notes, m.text.trim()) : HELP
    }
    return this.saveLinks(repos, notes, urls, rest, isAi)
  }

  // /start <code>: the code (made by the app, valid 15 minutes) names the account.
  private async connect(m: BotMessage, code: string) {
    const found = await this.links.code(code)
    if (!found || Date.now() - new Date(found.createdAt).getTime() > CODE_TTL_MS) return 'That link has expired. Open Settings → Connect Telegram again.'
    try {
      await this.links.link(found.userId, m.chatId, m.username)
    } catch (e) {
      console.error('connect', e)
      return `Couldn't connect: ${(e as Error).message}`
    }
    return `Connected to Compound.\n\n${HELP}`
  }

  private async saveLinks(repos: Repositories, notes: NoteService, urls: string[], rest: string, isAi: boolean) {
    let note = rest
    for (const u of findUrls(rest)) note = note.replace(u, '')
    note = note.replace(/\s+/g, ' ').trim()
    const topics = await this.topics(repos)
    const lines: string[] = []
    for (const url of urls) {
      const meta = await this.pages.read(url)
      const ai = await this.filer.classifyLink(url, meta, topics)
      const kind = kindFromUrl(url) ?? ai.kind ?? meta.kind ?? 'site'
      // With /ai the summary replaces the page's own description, and the text after the link is the question.
      const summary = isAi ? await this.filer.summarize(url, meta, note) : ''
      try {
        await notes.saveLink({ url, kind, context: [meta.title, summary || meta.description].filter(Boolean).join('\n'), tags: ai.tags, topic: ai.topic, body: note }, 'telegram')
        const topicName = topics.find((t) => t.id === ai.topic)?.name
        lines.push(`Saved as ${kind}${topicName ? ` in ${topicName}` : ''}: ${meta.title || url}\n${url}${ai.tags.length ? `\n${ai.tags.map((t) => `#${t}`).join(' ')}` : ''}${summary ? `\n\n${summary}` : ''}`)
      } catch (e) {
        console.error('save', e)
        lines.push(`Couldn't save ${url}: ${(e as Error).message}`)
      }
    }
    return lines.join('\n\n')
  }

  // A reply to a saved link adds its text to the link's note.
  private async noteOnLinks(notes: NoteService, urls: string[], text: string) {
    const lines: string[] = []
    for (const url of urls) {
      try {
        lines.push((await notes.appendToLink(url, text)) ? `Note added to ${url}` : `${url} isn't in your notebook. Send the link itself to save it.`)
      } catch (e) {
        console.error('reply note', e)
        lines.push(`Couldn't add the note: ${(e as Error).message}`)
      }
    }
    return lines.join('\n')
  }

  private async saveNote(repos: Repositories, notes: NoteService, text: string) {
    const topics = await this.topics(repos)
    const [first, ...rest] = text.split(/\s+/)
    const named = rest.length ? this.topicWord(topics, first) : null
    const body = named ? text.slice(first.length).trim() : text
    // One AI call files the note: topic (unless the first word named one), tags, and whether it's an idea.
    const ai = await this.filer.fileNote(body, topics)
    const topic = named ?? ai.topic ?? topics.find((t) => t.id === FALLBACK_TOPIC) ?? null
    const typed = [...body.matchAll(/#([\p{L}\d_-]+)/gu)].map((m) => cleanTag(m[1]))
    const idea = ai.idea || typed.includes('idea')
    // Ideas also carry the #idea tag, the same as ideas made in the app.
    const tags = [...new Set([...(idea ? ['idea'] : []), ...typed, ...ai.tags])]
    try {
      await notes.add({ text: body, tags, topic: topic?.id }, 'telegram')
    } catch (e) {
      console.error('note', e)
      return `Couldn't save the note: ${(e as Error).message}`
    }
    return `Noted${idea ? ' as an idea' : ''}${topic ? ` in ${topic.name}` : ''}${tags.length ? `\n${tags.map((t) => `#${t}`).join(' ')}` : ''}`
  }

  // The account's topics for filing (name and hint help the AI), or Personal for an account with none yet.
  private async topics(repos: Repositories): Promise<FilingTopic[]> {
    const live = (await repos.topics.all()).filter((c) => !c.archived)
    return live.length ? live.map((c) => ({ id: c.id, name: c.name, hint: c.hint || c.description?.slice(0, 120) || '' })) : FALLBACK
  }

  // "english text": the first word picks the topic when it names one (its id, its name, or its name's first word).
  private topicWord(topics: FilingTopic[], word: string) {
    const w = word.toLowerCase()
    return topics.find((c) => c.id === w || c.name.toLowerCase() === w || c.name.toLowerCase().split(/\s+/)[0] === w) ?? null
  }
}
