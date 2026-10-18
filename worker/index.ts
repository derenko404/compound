// Cloudflare Worker: serves the app from dist/, takes links from the Telegram bot at /tg, and serves AI access
// (/api/v1 and /mcp). Only those paths reach this code (run_worker_first in wrangler.jsonc); the rest is static assets.
import { createClient } from '@supabase/supabase-js'
import { cleanTag, findUrls, kindFromUrl } from '../src/lib/finds'
import type { LinkKind, Topic, TopicId } from '../src/lib/types'
import { handleApi, handleMcp } from './routes'

interface Env {
  ASSETS: { fetch(req: Request): Promise<Response> }
  AI: { run(model: string, input: unknown): Promise<{ response?: unknown }> }
  VITE_SUPABASE_URL: string
  // Secrets (wrangler secret put, or the dashboard's Variables and Secrets):
  SUPABASE_SECRET_KEY: string // service-role / secret key; bypasses RLS, so user_id is set explicitly
  TELEGRAM_BOT_TOKEN: string
  TELEGRAM_WEBHOOK_SECRET: string // the secret_token passed to setWebhook
}

interface Ctx {
  waitUntil(p: Promise<unknown>): void
}

interface TgEntity { type: string; url?: string }
interface TgMessage {
  chat: { id: number }
  from?: { username?: string }
  text?: string
  caption?: string
  entities?: TgEntity[]
  caption_entities?: TgEntity[]
  reply_to_message?: TgMessage
}

// Links in a message: typed URLs plus links hidden behind text.
const linksIn = (m: TgMessage, text = m.text ?? m.caption ?? '') => [
  ...new Set([
    ...findUrls(text),
    ...[...(m.entities ?? []), ...(m.caption_entities ?? [])].flatMap((e) => (e.type === 'text_link' && e.url ? [e.url] : [])),
  ]),
]

// Workers AI retires models (the plain 3.1 8B went on 2026-05-30); check the catalog if AI calls start failing.
// 70B: the 8B models picked note topics badly and can't be held to a JSON schema. About 7 neurons a call.
const MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast'

// Topics come from the account's topics table. A new account always has Personal, so the fallback only covers
// an account that hasn't opened the app yet.
interface Ch { id: TopicId; name: string; hint: string }
const FALLBACK: Ch[] = [{ id: 'own', name: 'Personal', hint: 'anything personal' }]

async function loadTopics(env: Env, user: string): Promise<Ch[]> {
  const { data, error } = await dbFor(env).from('topics').select('data').eq('user_id', user)
  if (error) console.error('topics', error)
  const live = ((data ?? []) as { data: Topic }[]).map((r) => r.data).filter((c) => !c.archived)
  return live.length ? live.map((c) => ({ id: c.id, name: c.name, hint: c.hint || c.description?.slice(0, 120) || '' })) : FALLBACK
}

const topicList = (chs: Ch[]) => chs.map((c) => `${c.id} = ${c.name}${c.hint ? `: ${c.hint}` : ''}`).join('\n')
const topicIn = (chs: Ch[], id: unknown) => chs.find((c) => c.id === id) ?? null
const UA = 'Mozilla/5.0 (compatible; CompoundBot/1.0)'
const HELP = [
  'Send me a link, with a note if you like, and I\'ll save it to your notebook. Reply to a link later to add a note to it.',
  'Any other text is saved as a note. Start it with a topic to pick one, e.g. "english practise th sounds"; otherwise the AI picks. The AI also adds tags and spots ideas (or add #idea); #tags you type are kept too.',
  '/ai <link> [question] reads the page, sums it up and saves it to your notebook. /ai <question> just asks the AI.',
].join('\n\n')

const dbFor = (env: Env) => createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } })

const DAY_MS = 86_400_000

// Daily cleanup (cron in wrangler.jsonc): shared links older than 7 days (get_share already hides them) and
// Telegram codes nobody used within a day (Settings makes one each time it shows Connect).
async function cleanup(env: Env) {
  const db = dbFor(env)
  const ago = (days: number) => new Date(Date.now() - days * DAY_MS).toISOString()
  const shares = await db.from('shares').delete({ count: 'exact' }).lt('created_at', ago(7))
  const codes = await db.from('telegram_codes').delete({ count: 'exact' }).lt('created_at', ago(1))
  for (const r of [shares, codes]) if (r.error) console.error('cleanup', r.error)
  console.log(`cleanup: ${shares.count ?? 0} shares, ${codes.count ?? 0} telegram codes`)
}

export default {
  async scheduled(_event: unknown, env: Env, ctx: Ctx) {
    ctx.waitUntil(cleanup(env))
  },

  async fetch(req: Request, env: Env, ctx: Ctx): Promise<Response> {
    const { pathname, origin } = new URL(req.url)
    // AI access: the REST API and the MCP server, both with a token from Settings → AI access.
    if (pathname.startsWith('/api/')) return handleApi(req, dbFor(env), origin)
    if (pathname === '/mcp' || pathname.startsWith('/mcp/')) return handleMcp(req, dbFor(env), origin)
    if (pathname !== '/tg') return env.ASSETS.fetch(req)
    if (req.method !== 'POST' || req.headers.get('x-telegram-bot-api-secret-token') !== env.TELEGRAM_WEBHOOK_SECRET)
      return new Response('Forbidden', { status: 403 })
    const update = (await req.json()) as { message?: TgMessage }
    // Answer Telegram at once; slow pages would otherwise make it retry the update.
    if (update.message) ctx.waitUntil(handle(update.message, env).catch((e) => console.error('tg', e)))
    return new Response('ok')
  },
}

const NOT_LINKED = 'Open Compound, then Settings → Connect Telegram, to link this chat to your account.'

// Each chat is linked to one account (table telegram_links); everything it sends is saved for that account.
async function userFor(env: Env, chat: number): Promise<string | null> {
  const { data, error } = await dbFor(env).from('telegram_links').select('user_id').eq('chat_id', chat).maybeSingle()
  if (error) console.error('link', error)
  return data?.user_id ?? null
}

// /start <code> from Settings → Connect Telegram: the code (made by the app, valid 15 minutes) names the account.
async function connect(env: Env, chat: number, username: string | null, code: string) {
  const db = dbFor(env)
  const { data } = await db.from('telegram_codes').select('user_id, created_at').eq('code', code).maybeSingle()
  if (!data || Date.now() - new Date(data.created_at).getTime() > 15 * 60_000) return 'That link has expired. Open Settings → Connect Telegram again.'
  // A chat belongs to one account: linking it here unlinks it anywhere else.
  await db.from('telegram_links').delete().eq('chat_id', chat)
  const { error } = await db.from('telegram_links').upsert({ user_id: data.user_id, chat_id: chat, username }, { onConflict: 'user_id' })
  await db.from('telegram_codes').delete().eq('user_id', data.user_id)
  if (error) {
    console.error('connect', error)
    return `Couldn't connect: ${error.message}`
  }
  return `Connected to Compound.\n\n${HELP}`
}

async function handle(msg: TgMessage, env: Env) {
  const chat = msg.chat.id
  const say = (text: string) => reply(env, chat, text)
  const text = msg.text ?? msg.caption ?? ''
  const start = text.match(/^\/start(?:@\w+)?(?:\s+([\w-]+))?/)
  if (start?.[1]) return say(await connect(env, chat, msg.from?.username ?? null, start[1]))
  const user = await userFor(env, chat)
  if (!user) return say(NOT_LINKED)

  const cmd = text.match(/^\/(\w+)(?:@\w+)?\s*([\s\S]*)$/)
  const isAi = cmd?.[1].toLowerCase() === 'ai'
  if (cmd && !isAi) return say(HELP)
  const rest = isAi ? cmd[2] : text

  const urls = linksIn(msg, rest)
  // A reply to a message with a link (yours, or the bot's "Saved" reply) adds a note to that link.
  const replied = msg.reply_to_message ? linksIn(msg.reply_to_message) : []
  if (!cmd && !urls.length && replied.length && text.trim()) return say(await noteOnLinks(env, user, replied, text.trim()))
  if (!urls.length) {
    if (isAi) return say(rest.trim() ? await ask(env, rest.trim()) : HELP)
    // Plain text with no link is a note.
    return say(text.trim() ? await saveNote(env, user, text.trim()) : HELP)
  }

  let note = rest
  for (const u of findUrls(rest)) note = note.replace(u, '')
  note = note.replace(/\s+/g, ' ').trim()

  const db = dbFor(env)
  const chs = await loadTopics(env, user)
  const lines: string[] = []
  for (const url of urls) {
    const meta = await pageMeta(url)
    const ai = await classify(env, url, meta, chs)
    const kind = kindFromUrl(url) ?? ai.kind ?? meta.kind ?? 'site'
    // With /ai the summary replaces the page's own description, and the text after the link is the question.
    const summary = isAi ? await analyze(env, url, meta, note) : ''
    // Upsert on the link: resending it updates the page details and keeps the old text unless new text came with it.
    const { error } = await db.from('notes').upsert(
      { user_id: user, type: 'link', url, kind, context: [meta.title, summary || meta.description].filter(Boolean).join('\n'), tags: ai.tags, topic: ai.topic ?? topicIn(chs, 'own')?.id ?? null, ...(note && { body: note }), source: 'telegram' },
      { onConflict: 'user_id,url' },
    )
    if (error) {
      console.error('save', error)
      lines.push(`Couldn't save ${url}: ${error.message}`)
    } else lines.push(`Saved as ${kind}${ai.topic ? ` in ${topicIn(chs, ai.topic)?.name}` : ''}: ${meta.title || url}\n${url}${ai.tags.length ? `\n${ai.tags.map((t) => `#${t}`).join(' ')}` : ''}${summary ? `\n\n${summary}` : ''}`)
  }
  await say(lines.join('\n\n'))
}

// A reply to a saved link adds its text to the link's note, on a new line.
async function noteOnLinks(env: Env, user: string, urls: string[], text: string) {
  const db = dbFor(env)
  const lines: string[] = []
  for (const url of urls) {
    const { data, error } = await db.from('notes').select('id, body').eq('user_id', user).eq('url', url).maybeSingle()
    const body = data?.body ? `${data.body}\n${text}` : text
    const res = error ?? (data ? (await db.from('notes').update({ body }).eq('id', data.id)).error : null)
    if (res) console.error('reply note', res)
    lines.push(res ? `Couldn't add the note: ${res.message}` : data ? `Note added to ${url}` : `${url} isn't in your notebook. Send the link itself to save it.`)
  }
  return lines.join('\n')
}

/* ---------- Notes: plain text for the notebook ---------- */

// "english text": the first word picks the topic when it names one (its id, its name, or its name's first word).
function topicWord(chs: Ch[], word: string): Ch | null {
  const w = word.toLowerCase()
  return chs.find((c) => c.id === w || c.name.toLowerCase() === w || c.name.toLowerCase().split(/\s+/)[0] === w) ?? null
}

async function saveNote(env: Env, user: string, text: string) {
  const chs = await loadTopics(env, user)
  const [first, ...rest] = text.split(/\s+/)
  const named = rest.length ? topicWord(chs, first) : null
  const body = named ? text.slice(first.length).trim() : text
  // One AI call files the note: topic (unless the first word named one), step tags, and whether it's an idea.
  const ai = await fileNote(env, body, chs)
  const topic = named ?? ai.topic ?? topicIn(chs, 'own')
  const typed = [...body.matchAll(/#([\p{L}\d_-]+)/gu)].map((m) => cleanTag(m[1]))
  const idea = ai.idea || typed.includes('idea')
  // Ideas also carry the #idea tag, the same as ideas made in the app.
  const tags = [...new Set([...(idea ? ['idea'] : []), ...typed, ...ai.tags])]
  const { error } = await dbFor(env).from('notes').insert({ user_id: user, type: idea ? 'idea' : 'note', topic: topic?.id ?? null, body, tags, source: 'telegram' })
  if (error) {
    console.error('note', error)
    return `Couldn't save the note: ${error.message}`
  }
  return `Noted${idea ? ' as an idea' : ''}${topic ? ` in ${topic.name}` : ''}${tags.length ? `\n${tags.map((t) => `#${t}`).join(' ')}` : ''}`
}

async function fileNote(env: Env, body: string, chs: Ch[]): Promise<{ topic: Ch | null; tags: string[]; idea: boolean }> {
  try {
    const response = await run(env, {
      max_tokens: 80,
      response_format: {
        type: 'json_schema',
        json_schema: {
          type: 'object',
          properties: {
            topic: { type: 'string', enum: chs.map((c) => c.id) },
            tags: { type: 'array', items: { type: 'string' }, maxItems: 3 },
            idea: { type: 'boolean' },
          },
          required: ['topic', 'tags', 'idea'],
        },
      },
      messages: [
        {
          role: 'system',
          content:
            'You file a personal note in a self-development notebook. Reply with JSON: {"topic": "<id>", "tags": [1 to 3 short lowercase subject words], "idea": true | false}. ' +
            'idea = true only when the note proposes something to build, start or try (a product, project, plan or experiment), not for facts, learnings, reminders or questions. ' +
            `topic = the part of the roadmap it belongs to:\n${topicList(chs)}`,
        },
        { role: 'user', content: body },
      ],
    })
    const j = JSON.parse(response.match(/\{[\s\S]*\}/)?.[0] ?? '{}') as { topic?: string; tags?: unknown; idea?: unknown }
    const tags = Array.isArray(j.tags)
      ? [...new Set(j.tags.filter((t): t is string => typeof t === 'string').map(cleanTag).filter((t) => t && t !== 'idea'))].slice(0, 3)
      : []
    return { topic: topicIn(chs, j.topic), tags, idea: j.idea === true }
  } catch (e) {
    console.error('ai', e)
    return { topic: null, tags: [], idea: false }
  }
}

/* ---------- /ai: summaries and questions ---------- */

async function analyze(env: Env, url: string, meta: Meta, question: string) {
  const source = meta.text
    ? `Page text:\n${meta.text}`
    : 'Only the title and description are available (no page text or transcript); say so briefly.'
  return chat(env, 500, [
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

const ask = (env: Env, question: string) =>
  chat(env, 700, [
    { role: 'system', content: 'You are a concise assistant for a software engineer working on a self-development roadmap. Plain text, no markdown.' },
    { role: 'user', content: question },
  ])

async function chat(env: Env, max_tokens: number, messages: { role: string; content: string }[]) {
  try {
    const response = await run(env, { max_tokens, messages })
    return response.trim().slice(0, 3500) || 'The AI had nothing to say. Try again.'
  } catch (e) {
    console.error('ai', e)
    return "Couldn't reach the AI. Try again in a minute."
  }
}

// Some models hand back JSON replies already parsed, so normalise to text.
async function run(env: Env, input: { max_tokens: number; messages: { role: string; content: string }[]; response_format?: unknown }) {
  const { response } = await env.AI.run(MODEL, input)
  return typeof response === 'string' ? response : response == null ? '' : JSON.stringify(response)
}

async function reply(env: Env, chat_id: number, text: string) {
  await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id, text, link_preview_options: { is_disabled: true } }),
  })
}

/* ---------- Page title and description ---------- */

interface Meta { title: string; description: string; kind: LinkKind | null; text: string }

const OEMBED: [RegExp, string][] = [
  [/(^|\.)(youtube\.com|youtu\.be)$/, 'https://www.youtube.com/oembed?format=json&url='],
  [/(^|\.)vimeo\.com$/, 'https://vimeo.com/api/oembed.json?url='],
]

async function pageMeta(url: string): Promise<Meta> {
  const blank: Meta = { title: '', description: '', kind: null, text: '' }
  try {
    const host = new URL(url).hostname
    const oembed = OEMBED.find(([re]) => re.test(host))
    if (oembed) {
      const r = await fetch(oembed[1] + encodeURIComponent(url), { signal: AbortSignal.timeout(8000) })
      if (r.ok) {
        const j = (await r.json()) as { title?: string; author_name?: string }
        return { title: j.title ?? '', description: j.author_name ?? '', kind: 'video', text: '' }
      }
    }
    const r = await fetch(url, { headers: { 'user-agent': UA, accept: 'text/html' }, redirect: 'follow', signal: AbortSignal.timeout(8000) })
    if (!r.ok || !(r.headers.get('content-type') ?? '').includes('html')) return blank
    const html = (await r.text()).slice(0, 300_000)
    const ogType = metaTag(html, 'og:type')
    return {
      title: clip(metaTag(html, 'og:title') || metaTag(html, 'twitter:title') || html.match(/<title[^>]*>([^<]*)/i)?.[1] || '', 200),
      description: clip(metaTag(html, 'og:description') || metaTag(html, 'description'), 300),
      kind: ogType.startsWith('video') ? 'video' : ogType === 'article' ? 'post' : null,
      text: pageText(html),
    }
  } catch (e) {
    console.error('meta', url, e)
    return blank
  }
}

// Readable text for /ai: drop scripts, styles and markup, keep about 3k words.
const pageText = (html: string) =>
  decode(
    html.replace(/<(script|style|noscript|svg|nav|footer|header)\b[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' '),
  ).replace(/\s+/g, ' ').trim().slice(0, 12_000)

function metaTag(html: string, name: string) {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const key = tag.match(/\b(?:property|name)\s*=\s*["']([^"']+)["']/i)?.[1]
    if (key?.toLowerCase() === name) return decode(tag.match(/\bcontent\s*=\s*"([^"]*)"|\bcontent\s*=\s*'([^']*)'/i)?.slice(1).find(Boolean) ?? '')
  }
  return ''
}

const decode = (s: string) =>
  s.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')

const clip = (s: string, n: number) => {
  const t = decode(s).replace(/\s+/g, ' ').trim()
  return t.length > n ? `${t.slice(0, n - 1)}…` : t
}

/* ---------- Kind and tags from Workers AI ---------- */

async function classify(env: Env, url: string, meta: Meta, chs: Ch[]): Promise<{ kind: LinkKind | null; tags: string[]; topic: TopicId | null }> {
  try {
    const response = await run(env, {
      max_tokens: 120,
      response_format: {
        type: 'json_schema',
        json_schema: {
          type: 'object',
          properties: {
            kind: { type: 'string', enum: ['video', 'post', 'site'] },
            tags: { type: 'array', items: { type: 'string' }, maxItems: 3 },
            topic: { type: 'string', enum: chs.map((c) => c.id) },
          },
          required: ['kind', 'tags', 'topic'],
        },
      },
      messages: [
        {
          role: 'system',
          content:
            'You file links into a personal bookmark list. Reply with JSON: {"kind": "video" | "post" | "site", "tags": [1 to 3 short lowercase subject words], "topic": "<id>"}. ' +
            'video = a video or talk to watch; post = one article, blog post, thread or social post; site = a whole site, tool, product, course or docs. ' +
            `topic = the part of the owner's self-development roadmap it helps with:\n${topicList(chs)}`,
        },
        { role: 'user', content: `URL: ${url}\nTitle: ${meta.title}\nDescription: ${meta.description}` },
      ],
    })
    const j = JSON.parse(response.match(/\{[\s\S]*\}/)?.[0] ?? '{}') as { kind?: string; tags?: unknown; topic?: string }
    const kind = j.kind === 'video' || j.kind === 'post' || j.kind === 'site' ? j.kind : null
    const tags = Array.isArray(j.tags)
      ? [...new Set(j.tags.filter((t): t is string => typeof t === 'string').map((t) => t.toLowerCase().replace(/^#/, '').trim().replace(/\s+/g, '-')).filter(Boolean))].slice(0, 3)
      : []
    return { kind, tags, topic: topicIn(chs, j.topic)?.id ?? null }
  } catch (e) {
    console.error('ai', e)
    return { kind: null, tags: [], topic: null }
  }
}
