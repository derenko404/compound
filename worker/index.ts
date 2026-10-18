// Cloudflare Worker: serves the app from dist/ and takes links from the Telegram bot at /tg.
// Only /tg reaches this code (run_worker_first in wrangler.jsonc); everything else goes straight to assets.
import { createClient } from '@supabase/supabase-js'
import { ALL_CHAPTERS, CH } from '../src/data/plan'
import { findUrls, kindFromUrl } from '../src/lib/finds'
import type { BookmarkKind, ChapterId } from '../src/lib/types'

interface Env {
  ASSETS: { fetch(req: Request): Promise<Response> }
  AI: { run(model: string, input: unknown): Promise<{ response?: unknown }> }
  VITE_SUPABASE_URL: string
  // Secrets (wrangler secret put, or the dashboard's Variables and Secrets):
  SUPABASE_SECRET_KEY: string // service-role / secret key; bypasses RLS, so user_id is set explicitly
  OWNER_USER_ID: string // your auth.users id
  TELEGRAM_BOT_TOKEN: string
  TELEGRAM_WEBHOOK_SECRET: string // the secret_token passed to setWebhook
  TELEGRAM_CHAT_ID?: string // your chat with the bot; until set, the bot only replies with the chat id
}

interface Ctx {
  waitUntil(p: Promise<unknown>): void
}

interface TgEntity { type: string; url?: string }
interface TgMessage {
  chat: { id: number }
  text?: string
  caption?: string
  entities?: TgEntity[]
  caption_entities?: TgEntity[]
}

// Workers AI retires models (the plain 3.1 8B went on 2026-05-30); check the catalog if AI calls start failing.
// 70B: the 8B models picked note chapters badly and can't be held to a JSON schema. About 7 neurons a call.
const MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast'

// What each chapter covers, so the AI can file notes; ids and names come from src/data/plan.ts.
const CHAPTER_HINTS: Record<ChapterId, string> = {
  tech: 'system design, backend, cloud, databases, code, AI engineering',
  product: 'product sense, UI/UX design, metrics, A/B tests',
  mgmt: 'teams, 1:1s, hiring, project management',
  biz: 'startups, adtech, how companies work, strategy',
  eng: 'pronunciation, speaking, writing, public speaking',
  money: 'budget, savings, investing',
  smoke: 'cravings, triggers',
  gym: 'workouts, food, weight, sleep',
  own: 'anything personal that fits nothing above',
}
const UA = 'Mozilla/5.0 (compatible; RoadmapFinds/1.0)'
const HELP = [
  'Send me a link, with a note if you like, and I\'ll save it to Finds.',
  'Any other text is saved as a note in Notes. Start it with a chapter to pick one, e.g. "english practise th sounds"; otherwise the AI picks.',
  '/ai <link> [question] reads the page, sums it up and saves it to Finds. /ai <question> just asks the AI.',
].join('\n\n')

const dbFor = (env: Env) => createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } })

export default {
  async fetch(req: Request, env: Env, ctx: Ctx): Promise<Response> {
    const { pathname } = new URL(req.url)
    if (pathname !== '/tg') return env.ASSETS.fetch(req)
    if (req.method !== 'POST' || req.headers.get('x-telegram-bot-api-secret-token') !== env.TELEGRAM_WEBHOOK_SECRET)
      return new Response('Forbidden', { status: 403 })
    const update = (await req.json()) as { message?: TgMessage }
    // Answer Telegram at once; slow pages would otherwise make it retry the update.
    if (update.message) ctx.waitUntil(handle(update.message, env).catch((e) => console.error('tg', e)))
    return new Response('ok')
  },
}

async function handle(msg: TgMessage, env: Env) {
  const chat = msg.chat.id
  const say = (text: string) => reply(env, chat, text)
  if (String(chat) !== env.TELEGRAM_CHAT_ID) return say(`This bot is private. Your chat id is ${chat}.`)

  const text = msg.text ?? msg.caption ?? ''
  const cmd = text.match(/^\/(\w+)(?:@\w+)?\s*([\s\S]*)$/)
  if (cmd?.[1].toLowerCase() === 'note') return say(await saveNote(env, cmd[2].trim()))
  const isAi = cmd?.[1].toLowerCase() === 'ai'
  if (cmd && !isAi) return say(HELP)
  const rest = isAi ? cmd[2] : text

  const linked = [...(msg.entities ?? []), ...(msg.caption_entities ?? [])].flatMap((e) => (e.type === 'text_link' && e.url ? [e.url] : []))
  const urls = [...new Set([...findUrls(rest), ...linked])]
  if (!urls.length) {
    if (isAi) return say(rest.trim() ? await ask(env, rest.trim()) : HELP)
    // Plain text with no link is a note, same as /note.
    return say(text.trim() ? await saveNote(env, text.trim()) : HELP)
  }

  let note = rest
  for (const u of findUrls(rest)) note = note.replace(u, '')
  note = note.replace(/\s+/g, ' ').trim()

  const db = dbFor(env)
  const lines: string[] = []
  for (const url of urls) {
    const meta = await pageMeta(url)
    const ai = await classify(env, url, meta)
    const kind = kindFromUrl(url) ?? ai.kind ?? meta.kind ?? 'site'
    // With /ai the summary replaces the page's own description, and the text after the link is the question.
    const summary = isAi ? await analyze(env, url, meta, note) : ''
    const { error } = await db.from('bookmarks').upsert(
      { user_id: env.OWNER_USER_ID, url, kind, title: meta.title, description: summary || meta.description, tags: ai.tags, ...(note && { note }), source: 'telegram' },
      { onConflict: 'user_id,url' },
    )
    if (error) {
      console.error('save', error)
      lines.push(`Couldn't save ${url}: ${error.message}`)
    } else lines.push(`Saved as ${kind}: ${meta.title || url}${ai.tags.length ? `\n${ai.tags.map((t) => `#${t}`).join(' ')}` : ''}${summary ? `\n\n${summary}` : ''}`)
  }
  await say(lines.join('\n\n'))
}

/* ---------- /note: a note for the Notes tab ---------- */

// "/note english text": the first word picks the chapter when it names one (id or short name).
function chapterWord(word: string): ChapterId | null {
  const w = word.toLowerCase()
  return ALL_CHAPTERS.find((c) => c === w || CH[c].short.toLowerCase() === w) ?? null
}

async function saveNote(env: Env, text: string) {
  if (!text) return 'Write the note after /note, e.g. /note english practise th sounds before the call'
  const [first, ...rest] = text.split(/\s+/)
  const named = rest.length ? chapterWord(first) : null
  const body = named ? text.slice(first.length).trim() : text
  const chapter = named ?? (await pickChapter(env, body)) ?? 'own'
  const { error } = await dbFor(env).from('notes').insert({ user_id: env.OWNER_USER_ID, chapter, body })
  if (error) {
    console.error('note', error)
    return `Couldn't save the note: ${error.message}`
  }
  return `Noted in ${CH[chapter].name}.`
}

async function pickChapter(env: Env, body: string): Promise<ChapterId | null> {
  try {
    const response = await run(env, {
      max_tokens: 30,
      response_format: { type: 'json_schema', json_schema: { type: 'object', properties: { chapter: { type: 'string', enum: ALL_CHAPTERS } }, required: ['chapter'] } },
      messages: [
        {
          role: 'system',
          content: `File a personal note under one chapter of a self-development roadmap. Chapters:\n${ALL_CHAPTERS.map((c) => `${c} = ${CH[c].name}: ${CHAPTER_HINTS[c]}`).join('\n')}\nReply with JSON: {"chapter": "<id>"}.`,
        },
        { role: 'user', content: body },
      ],
    })
    const { chapter } = JSON.parse(response.match(/\{[\s\S]*\}/)?.[0] ?? '{}') as { chapter?: string }
    return ALL_CHAPTERS.find((c) => c === chapter) ?? null
  } catch (e) {
    console.error('ai', e)
    return null
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

interface Meta { title: string; description: string; kind: BookmarkKind | null; text: string }

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

async function classify(env: Env, url: string, meta: Meta): Promise<{ kind: BookmarkKind | null; tags: string[] }> {
  try {
    const response = await run(env, {
      max_tokens: 120,
      response_format: {
        type: 'json_schema',
        json_schema: { type: 'object', properties: { kind: { type: 'string', enum: ['video', 'post', 'site'] }, tags: { type: 'array', items: { type: 'string' }, maxItems: 3 } }, required: ['kind', 'tags'] },
      },
      messages: [
        {
          role: 'system',
          content:
            'You file links into a personal bookmark list. Reply with JSON only: {"kind": "video" | "post" | "site", "tags": [1 to 3 short lowercase topic words]}. ' +
            'video = a video or talk to watch; post = one article, blog post, thread or social post; site = a whole site, tool, product, course or docs.',
        },
        { role: 'user', content: `URL: ${url}\nTitle: ${meta.title}\nDescription: ${meta.description}` },
      ],
    })
    const j = JSON.parse(response.match(/\{[\s\S]*\}/)?.[0] ?? '{}') as { kind?: string; tags?: unknown }
    const kind = j.kind === 'video' || j.kind === 'post' || j.kind === 'site' ? j.kind : null
    const tags = Array.isArray(j.tags)
      ? [...new Set(j.tags.filter((t): t is string => typeof t === 'string').map((t) => t.toLowerCase().replace(/^#/, '').trim().replace(/\s+/g, '-')).filter(Boolean))].slice(0, 3)
      : []
    return { kind, tags }
  } catch (e) {
    console.error('ai', e)
    return { kind: null, tags: [] }
  }
}
