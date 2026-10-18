import { useEffect, useMemo, useRef, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ALL_CHAPTERS, CH } from '@/data/plan'
import { addDays, fmtLong, keyOf, parseKey } from '@/lib/dates'
import { KINDS, findUrls, hostOf, kindFromUrl, kindName } from '@/lib/finds'
import type { Bookmark, BookmarkKind, ChapterId } from '@/lib/types'
import { useStore } from '@/store/StoreProvider'
import { burst, toast } from '@/fx/fx'
import { ConfirmButton, Header, Section, cvar, empty } from '@/components/kit'

const KIND_ORDER: Record<BookmarkKind, number> = { video: 0, post: 1, site: 2 }
const hay = (b: Bookmark) => [b.title, b.description, b.note, b.url, b.tags.join(' ')].join(' ').toLowerCase()

function dayTitle(key: string) {
  const today = new Date()
  if (key === keyOf(today)) return 'Today'
  if (key === keyOf(addDays(today, -1))) return 'Yesterday'
  return fmtLong(parseKey(key))
}

const PAGE = 20

function FindCard({ b, onTag }: { b: Bookmark; onTag: (t: string) => void }) {
  const { dispatch } = useStore()
  return (
    <div className="note" style={b.chapter ? cvar(b.chapter) : ({ '--c': 'var(--primary)' } as React.CSSProperties)}>
      <div className="note-meta">
        {b.chapter && <><span className="dot" /><span>{CH[b.chapter].short}</span></>}
        <span>{kindName(b.kind)}</span>
        <span>{hostOf(b.url)}</span>
        {b.source === 'telegram' && <span>via Telegram</span>}
      </div>
      <a href={b.url} target="_blank" rel="noreferrer" className="row-title font-display text-lg text-foreground break-words">
        {b.title || hostOf(b.url)}
      </a>
      {b.description && <div className="row-sub line-clamp-2">{b.description}</div>}
      {b.note && <div className="note-text mt-2">{b.note}</div>}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          {b.tags.map((t) => (
            <button key={t} onClick={() => onTag(t)} aria-label={`Show finds tagged ${t}`}><Badge variant="outline">#{t}</Badge></button>
          ))}
        </div>
        <ConfirmButton label="Delete" armed="Tap again to delete" onConfirm={() => { dispatch({ type: 'deleteBookmark', id: b.id }); toast('Deleted.') }} />
      </div>
    </div>
  )
}

export function Finds() {
  const { state, dispatch } = useStore()
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [tagText, setTagText] = useState('')
  const [pick, setPick] = useState<BookmarkKind | null>(null)
  const [formCh, setFormCh] = useState<ChapterId | 'none'>('none')
  const [kind, setKind] = useState<BookmarkKind | null>(null)
  const [chapter, setChapter] = useState<ChapterId | null>(null)
  const [tag, setTag] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [page, setPage] = useState({ key: '', n: PAGE })
  const more = useRef<HTMLDivElement>(null)

  const link = findUrls(url)[0] ?? ''
  const guess = link ? kindFromUrl(link) ?? 'site' : null
  const formKind = pick ?? guess

  const [counts, tagCounts, chCounts] = useMemo(() => {
    const c: Record<string, number> = {}
    const t: Record<string, number> = {}
    const h: Record<string, number> = {}
    for (const b of state.bookmarks) {
      c[b.kind] = (c[b.kind] || 0) + 1
      for (const x of b.tags) t[x] = (t[x] || 0) + 1
      if (b.chapter) h[b.chapter] = (h[b.chapter] || 0) + 1
    }
    return [c, t, h]
  }, [state.bookmarks])
  const chapters = ALL_CHAPTERS.filter((c) => chCounts[c])
  const activeCh = chapter && chCounts[chapter] ? chapter : null
  const tags = Object.keys(tagCounts).sort((a, b) => tagCounts[b] - tagCounts[a] || a.localeCompare(b))
  const activeTag = tag && tagCounts[tag] ? tag : null

  const q = query.toLowerCase()
  const shown = useMemo(
    () => state.bookmarks.filter((b) =>
      (!kind || b.kind === kind) && (!activeCh || b.chapter === activeCh) && (!activeTag || b.tags.includes(activeTag)) && (!q || hay(b).includes(q))),
    [state.bookmarks, kind, activeCh, activeTag, q],
  )
  // Changing a filter starts again from the first page.
  const fkey = `${kind}|${activeCh}|${activeTag}|${q}`
  const limit = page.key === fkey ? page.n : PAGE
  useEffect(() => {
    const el = more.current
    if (!el) return
    const io = new IntersectionObserver((es) => { if (es[0].isIntersecting) setPage({ key: fkey, n: limit + PAGE }) }, { rootMargin: '400px' })
    io.observe(el)
    return () => io.disconnect()
  }, [fkey, limit, shown.length])

  const days = useMemo(() => {
    const by = new Map<string, Bookmark[]>()
    for (const b of shown.slice(0, limit)) {
      const k = keyOf(new Date(b.created_at))
      by.set(k, [...(by.get(k) ?? []), b])
    }
    return [...by.entries()]
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([k, items]) => [k, items.sort((x, y) => KIND_ORDER[x.kind] - KIND_ORDER[y.kind] || y.created_at.localeCompare(x.created_at))] as const)
  }, [shown, limit])

  return (
    <>
      <Header title="Finds" lead="Interesting things to come back to. Save them here, or send a link to your Telegram bot." />
      <Section title="Save a find">
        <div className="panel grid gap-3">
          <div className="field">
            <Label htmlFor="find-url">Link</Label>
            <Input id="find-url" className="bg-background" inputMode="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
          </div>
          <div className="field">
            <Label htmlFor="find-title">Title (optional)</Label>
            <Input id="find-title" className="bg-background" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What it is, in a few words" />
          </div>
          <div className="field">
            <Label htmlFor="find-note">Note (optional)</Label>
            <Textarea id="find-note" rows={2} className="bg-background" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why it's interesting" />
          </div>
          <div className="field">
            <Label htmlFor="find-tags">Tags, separated by commas</Label>
            <Input id="find-tags" className="bg-background" list="find-tag-options" value={tagText} onChange={(e) => setTagText(e.target.value)} placeholder="ai, design, english" />
            <datalist id="find-tag-options">{tags.map((t) => <option key={t} value={t} />)}</datalist>
          </div>
          <div className="field">
            <Label htmlFor="find-chapter">Chapter</Label>
            <Select value={formCh} onValueChange={(v) => setFormCh(v as ChapterId | 'none')}>
              <SelectTrigger id="find-chapter" className="w-full bg-background"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No chapter</SelectItem>
                {ALL_CHAPTERS.map((c) => (
                  <SelectItem key={c} value={c}><span className="dot" style={cvar(c)} />{CH[c].name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="chips" role="group" aria-label="Type">
            {KINDS.map((k) => (
              <button key={k.id} className="chbtn" aria-pressed={formKind === k.id} onClick={() => setPick(k.id)}>{kindName(k.id)}</button>
            ))}
          </div>
          <div>
            <Button onClick={(e) => {
              if (!link) return toast('Paste a link first.')
              if (state.bookmarks.some((b) => b.url === link)) return toast('Already saved.')
              dispatch({
                type: 'addBookmark',
                bookmark: {
                  id: crypto.randomUUID(), url: link, kind: formKind ?? 'site', title: title.trim(), description: '',
                  tags: [...new Set(tagText.split(',').map((t) => t.trim().toLowerCase().replace(/^#/, '').replace(/\s+/g, '-')).filter(Boolean))],
                  note: note.trim(), chapter: formCh === 'none' ? null : formCh, source: 'app', created_at: new Date().toISOString(),
                },
              })
              burst(e.currentTarget, 16)
              setUrl(''); setTitle(''); setNote(''); setTagText(''); setPick(null); setFormCh('none')
              toast('Saved.')
            }}>Save</Button>
          </div>
        </div>
      </Section>

      <Section title="Your finds" aside={state.bookmarks.length}>
        <div className="field mb-3">
          <Label htmlFor="find-search">Search finds</Label>
          <Input id="find-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Words in the title, note, tags or link" />
        </div>
        {state.bookmarks.length > 0 && (
          <div className="chips">
            <button className="chbtn" aria-pressed={!kind} onClick={() => setKind(null)}>All <span className="font-normal text-muted-foreground">{state.bookmarks.length}</span></button>
            {KINDS.filter((k) => counts[k.id]).map((k) => (
              <button key={k.id} className="chbtn" aria-pressed={kind === k.id} onClick={() => setKind(k.id)}>
                {k.label} <span className="font-normal text-muted-foreground">{counts[k.id]}</span>
              </button>
            ))}
          </div>
        )}
        {chapters.length > 0 && (
          <div className="chips">
            {activeCh && <button className="chbtn" onClick={() => setChapter(null)}>All chapters</button>}
            {chapters.map((c) => (
              <button key={c} className="chbtn" style={cvar(c)} aria-pressed={activeCh === c} onClick={() => setChapter(activeCh === c ? null : c)}>
                <span className="dot" />{CH[c].short} <span className="font-normal text-muted-foreground">{chCounts[c]}</span>
              </button>
            ))}
          </div>
        )}
        {tags.length > 0 && (
          <div className="chips">
            {activeTag && <button className="chbtn" onClick={() => setTag(null)}>All tags</button>}
            {tags.map((t) => (
              <button key={t} className="chbtn" aria-pressed={activeTag === t} onClick={() => setTag(activeTag === t ? null : t)}>
                #{t} <span className="font-normal text-muted-foreground">{tagCounts[t]}</span>
              </button>
            ))}
          </div>
        )}
        {days.length
          ? days.map(([k, items]) => (
              <div key={k} className="mb-5">
                <h3 className="mb-2 text-sm font-bold text-muted-foreground">{dayTitle(k)}</h3>
                <div className="list">{items.map((b) => <FindCard key={b.id} b={b} onTag={setTag} />)}</div>
              </div>
            ))
          : empty(state.bookmarks.length ? 'No finds match.' : 'Nothing saved yet. Paste a link above or send one to your bot.')}
        {shown.length > limit && <div ref={more} className="empty">Loading more…</div>}
      </Section>
    </>
  )
}
