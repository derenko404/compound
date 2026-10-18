import type { PageMeta, PageReaderPort } from '../../core/ports/page-reader'

const UA = 'Mozilla/5.0 (compatible; CompoundBot/1.0)'
const OEMBED: [RegExp, string][] = [
  [/(^|\.)(youtube\.com|youtu\.be)$/, 'https://www.youtube.com/oembed?format=json&url='],
  [/(^|\.)vimeo\.com$/, 'https://vimeo.com/api/oembed.json?url='],
]

/** Reads a link over the web: oEmbed for YouTube and Vimeo, otherwise the page's meta tags and text. */
export class FetchPageReader implements PageReaderPort {
  private static readonly blank: PageMeta = { title: '', description: '', kind: null, text: '' }

  async read(url: string): Promise<PageMeta> {
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
      if (!r.ok || !(r.headers.get('content-type') ?? '').includes('html')) return FetchPageReader.blank
      const html = (await r.text()).slice(0, 300_000)
      const ogType = this.metaTag(html, 'og:type')
      return {
        title: this.clip(this.metaTag(html, 'og:title') || this.metaTag(html, 'twitter:title') || html.match(/<title[^>]*>([^<]*)/i)?.[1] || '', 200),
        description: this.clip(this.metaTag(html, 'og:description') || this.metaTag(html, 'description'), 300),
        kind: ogType.startsWith('video') ? 'video' : ogType === 'article' ? 'post' : null,
        text: this.pageText(html),
      }
    } catch (e) {
      console.error('meta', url, e)
      return FetchPageReader.blank
    }
  }

  // Readable text for summaries: drop scripts, styles and markup, keep about 3k words.
  private pageText(html: string) {
    return this.decode(html.replace(/<(script|style|noscript|svg|nav|footer|header)\b[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' '))
      .replace(/\s+/g, ' ').trim().slice(0, 12_000)
  }

  private metaTag(html: string, name: string) {
    for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
      const key = tag.match(/\b(?:property|name)\s*=\s*["']([^"']+)["']/i)?.[1]
      if (key?.toLowerCase() === name) return this.decode(tag.match(/\bcontent\s*=\s*"([^"]*)"|\bcontent\s*=\s*'([^']*)'/i)?.slice(1).find(Boolean) ?? '')
    }
    return ''
  }

  private decode(s: string) {
    return s.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
      .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
      .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
  }

  private clip(s: string, n: number) {
    const t = this.decode(s).replace(/\s+/g, ' ').trim()
    return t.length > n ? `${t.slice(0, n - 1)}…` : t
  }
}
