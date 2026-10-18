// Shared by the app and the Telegram worker (worker/index.ts), so keep it free of DOM and app imports.
import type { LinkKind } from './types'

const KINDS: { id: LinkKind; label: string }[] = [
  { id: 'video', label: 'Videos' },
  { id: 'post', label: 'Posts' },
  { id: 'site', label: 'Sites' },
]

const kindName = (k: LinkKind) => KINDS.find((x) => x.id === k)!.label.slice(0, -1)

const VIDEO = ['youtube.com', 'youtu.be', 'vimeo.com', 'tiktok.com', 'twitch.tv', 'loom.com', 'ted.com', 'dailymotion.com']
const POST = [
  'x.com', 'twitter.com', 'linkedin.com', 'reddit.com', 't.me', 'threads.net', 'instagram.com', 'facebook.com',
  'medium.com', 'substack.com', 'dev.to', 'habr.com', 'news.ycombinator.com', 'bsky.app', 'mastodon.social',
]

const onDomain = (host: string, list: string[]) => list.some((d) => host === d || host.endsWith(`.${d}`))

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

// Kind from the domain alone; null when the domain doesn't tell.
function kindFromUrl(url: string): LinkKind | null {
  const host = hostOf(url)
  if (onDomain(host, VIDEO)) return 'video'
  if (onDomain(host, POST)) return 'post'
  return null
}

const URL_RE = /https?:\/\/[^\s<>"']+/g

// Trailing punctuation from a sentence isn't part of the link.
const findUrls = (text: string) => [...new Set((text.match(URL_RE) ?? []).map((u) => u.replace(/[.,;:!?)\]]+$/, '')))]

// Tags are lowercase words joined by dashes, without the #.
const cleanTag = (t: string) => t.trim().toLowerCase().replace(/^#/, '').replace(/\s+/g, '-')

// The video id of a YouTube link, for its thumbnail.
function youtubeId(url: string) {
  try {
    const u = new URL(url)
    const host = u.hostname.replace(/^www\.|^m\./, '')
    if (host === 'youtu.be') return u.pathname.slice(1) || null
    if (host === 'youtube.com') return u.searchParams.get('v') ?? u.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]+)/)?.[1] ?? null
  } catch { /* not a URL */ }
  return null
}

export const links = { KINDS, kindName, hostOf, kindFromUrl, URL_RE, findUrls, cleanTag, youtubeId }
