// Shared by the app and the Telegram worker (worker/index.ts), so keep it free of DOM and app imports.
import type { BookmarkKind } from './types'

export const KINDS: { id: BookmarkKind; label: string }[] = [
  { id: 'video', label: 'Videos' },
  { id: 'post', label: 'Posts' },
  { id: 'site', label: 'Sites' },
]

const VIDEO = ['youtube.com', 'youtu.be', 'vimeo.com', 'tiktok.com', 'twitch.tv', 'loom.com', 'ted.com', 'dailymotion.com']
const POST = [
  'x.com', 'twitter.com', 'linkedin.com', 'reddit.com', 't.me', 'threads.net', 'instagram.com', 'facebook.com',
  'medium.com', 'substack.com', 'dev.to', 'habr.com', 'news.ycombinator.com', 'bsky.app', 'mastodon.social',
]

const onDomain = (host: string, list: string[]) => list.some((d) => host === d || host.endsWith(`.${d}`))

export const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

// Kind from the domain alone; null when the domain doesn't tell.
export function kindFromUrl(url: string): BookmarkKind | null {
  const host = hostOf(url)
  if (onDomain(host, VIDEO)) return 'video'
  if (onDomain(host, POST)) return 'post'
  return null
}

export const URL_RE = /https?:\/\/[^\s<>"']+/g

// Trailing punctuation from a sentence isn't part of the link.
export const findUrls = (text: string) => [...new Set((text.match(URL_RE) ?? []).map((u) => u.replace(/[.,;:!?)\]]+$/, '')))]
