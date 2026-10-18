// Cloudflare Worker: serves the app from dist/ and takes links from the Telegram bot at /tg.
// Only /tg reaches this code (run_worker_first in wrangler.jsonc); everything else goes straight to assets.
import { createClient } from '@supabase/supabase-js'
import { findUrls, kindFromUrl } from '../src/lib/finds'
import type { BookmarkKind } from '../src/lib/types'

interface Env {
  ASSETS: { fetch(req: Request): Promise<Response> }
  AI: { run(model: string, input: unknown): Promise<{ response?: string }> }
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

const MODEL = '@cf/meta/llama-3.1-8b-instruct'
const UA = 'Mozilla/5.0 (compatible; RoadmapFinds/1.0)'

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
  const linked = [...(msg.entities ?? []), ...(msg.caption_entities ?? [])].flatMap((e) => (e.type === 'text_link' && e.url ? [e.url] : []))
  const urls = [...new Set([...findUrls(text), ...linked])]
  if (!urls.length) return say('Send me a link, with a note if you like, and I\'ll save it to Finds.')

  let note = text
  for (const u of findUrls(text)) note = note.replace(u, '')
  note = note.replace(/\s+/g, ' ').trim()

  const db = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } })
  const lines: string[] = []
  for (const url of urls) {
    const meta = await pageMeta(url)
    const ai = await classify(env, url, meta)
    const kind = kindFromUrl(url) ?? ai.kind ?? meta.kind ?? 'site'
    const { error } = await db.from('bookmarks').upsert(
      { user_id: env.OWNER_USER_ID, url, kind, title: meta.title, description: meta.description, tags: ai.tags, note, source: 'telegram' },
      { onConflict: 'user_id,url' },
    )
    if (error) {
      console.error('save', error)
      lines.push(`Couldn't save ${url}: ${error.message}`)
    } else lines.push(`Saved as ${kind}: ${meta.title || url}${ai.tags.length ? `\n${ai.tags.map((t) => `#${t}`).join(' ')}` : ''}`)
  }
  await say(lines.join('\n\n'))
}

async function reply(env: Env, chat_id: number, text: string) {
  await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id, text, link_preview_options: { is_disabled: true } }),
  })
}

/* ---------- Page title and description ---------- */

interface Meta { title: string; description: string; kind: BookmarkKind | null }

const OEMBED: [RegExp, string][] = [
  [/(^|\.)(youtube\.com|youtu\.be)$/, 'https://www.youtube.com/oembed?format=json&url='],
  [/(^|\.)vimeo\.com$/, 'https://vimeo.com/api/oembed.json?url='],
]

async function pageMeta(url: string): Promise<Meta> {
  const blank: Meta = { title: '', description: '', kind: null }
  try {
    const host = new URL(url).hostname
    const oembed = OEMBED.find(([re]) => re.test(host))
    if (oembed) {
      const r = await fetch(oembed[1] + encodeURIComponent(url), { signal: AbortSignal.timeout(8000) })
      if (r.ok) {
        const j = (await r.json()) as { title?: string; author_name?: string }
        return { title: j.title ?? '', description: j.author_name ?? '', kind: 'video' }
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
    }
  } catch (e) {
    console.error('meta', url, e)
    return blank
  }
}

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
    const { response = '' } = await env.AI.run(MODEL, {
      max_tokens: 120,
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
