import { useEffect, useMemo, useRef, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { chapterShort, chapters as allChapters } from '@/lib/content'
import { addDays, fmtLong, keyOf, parseKey } from '@/lib/dates'
import { KINDS, findUrls, hostOf, kindFromUrl, kindName } from '@/lib/finds'
import type { Bookmark, BookmarkKind, ChapterId } from '@/lib/types'
import { useStore } from '@/store/StoreProvider'
import { toast } from '@/fx/fx'
import { AreaField, ChapterField, Field, FormSheet, PlusButton, TextField, fail } from '@/components/edit'
import { Chip, Chips, ConfirmButton, Dot, Entry, Header, List, SearchField, Section, empty } from '@/components/kit'

const KIND_ORDER: Record<BookmarkKind, number> = { video: 0, post: 1, site: 2 }
const hay = (b: Bookmark) => [b.title, b.description, b.note, b.url, b.tags.join(' ')].join(' ').toLowerCase()

function dayTitle(key: string) {
  const today = new Date()
  if (key === keyOf(today)) return 'Today'
  if (key === keyOf(addDays(today, -1))) return 'Yesterday'
  return fmtLong(parseKey(key))
}

const PAGE = 20

function FindSheet({ open, onOpenChange, tags }: { open: boolean; onOpenChange: (o: boolean) => void; tags: string[] }) {
  const { state, dispatch } = useStore()
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [tagText, setTagText] = useState('')
  const [pick, setPick] = useState<BookmarkKind | null>(null)
  const [chapter, setChapter] = useState<ChapterId | null>(null)
  const link = findUrls(url)[0] ?? ''
  const formKind = pick ?? (link ? kindFromUrl(link) ?? 'site' : null)
  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title="Save a find" submit="Save"
      onSubmit={() => {
        if (!link) return fail('Paste a link first.')
        if (state.bookmarks.some((b) => b.url === link)) return fail('Already saved.')
        dispatch({
          type: 'addBookmark',
          bookmark: {
            id: crypto.randomUUID(), url: link, kind: formKind ?? 'site', title: title.trim(), description: '',
            tags: [...new Set(tagText.split(',').map((t) => t.trim().toLowerCase().replace(/^#/, '').replace(/\s+/g, '-')).filter(Boolean))],
            note: note.trim(), chapter, source: 'app', created_at: new Date().toISOString(),
          },
        })
        toast('Saved.')
      }}>
      <Field label="Link">{(id) => <Input id={id} inputMode="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" autoFocus />}</Field>
      <TextField label="Title (optional)" value={title} onChange={setTitle} placeholder="What it is, in a few words" full />
      <AreaField label="Note (optional)" value={note} onChange={setNote} rows={2} placeholder="Why it's interesting" />
      <Field label="Tags, separated by commas">
        {(id) => <>
          <Input id={id} list="find-tag-options" value={tagText} onChange={(e) => setTagText(e.target.value)} placeholder="ai, design, english" />
          <datalist id="find-tag-options">{tags.map((t) => <option key={t} value={t} />)}</datalist>
        </>}
      </Field>
      <ChapterField value={chapter} onChange={setChapter} allowNone="No chapter" />
      <Chips className="m-0">
        {KINDS.map((k) => <Chip key={k.id} pressed={formKind === k.id} onClick={() => setPick(k.id)}>{kindName(k.id)}</Chip>)}
      </Chips>
    </FormSheet>
  )
}

function FindCard({ b, onTag }: { b: Bookmark; onTag: (t: string) => void }) {
  const { state, dispatch } = useStore()
  return (
    <Entry ch={b.chapter} meta={<>
      {b.chapter && <><Dot /><span>{chapterShort(state, b.chapter)}</span></>}
      <span>{kindName(b.kind)}</span>
      <span>{hostOf(b.url)}</span>
      {b.source === 'telegram' && <span>via Telegram</span>}
    </>}>
      <a href={b.url} target="_blank" rel="noreferrer" className="row-title font-display text-title text-foreground break-words">
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
    </Entry>
  )
}

export function Finds() {
  const { state } = useStore()
  const [adding, setAdding] = useState(false)
  const [kind, setKind] = useState<BookmarkKind | null>(null)
  const [chapter, setChapter] = useState<ChapterId | null>(null)
  const [tag, setTag] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [page, setPage] = useState({ key: '', n: PAGE })
  const more = useRef<HTMLDivElement>(null)

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
  const chapters = allChapters(state).map((c) => c.id).filter((c) => chCounts[c])
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
      <Header title="Finds" lead="Interesting things to come back to. Save them here, or send a link to your Telegram bot.">
        <PlusButton label="Save a find" onClick={() => setAdding(true)} />
      </Header>
      <Section title="Your finds" aside={state.bookmarks.length}>
        <SearchField className="mb-3" label="Search finds" value={query} onChange={setQuery} placeholder="Words in the title, note, tags or link" />
        {state.bookmarks.length > 0 && (
          <Chips>
            <Chip pressed={!kind} onClick={() => setKind(null)} count={state.bookmarks.length}>All</Chip>
            {KINDS.filter((k) => counts[k.id]).map((k) => (
              <Chip key={k.id} pressed={kind === k.id} onClick={() => setKind(k.id)} count={counts[k.id]}>{k.label}</Chip>
            ))}
          </Chips>
        )}
        {chapters.length > 0 && (
          <Chips>
            {activeCh && <Chip onClick={() => setChapter(null)}>All chapters</Chip>}
            {chapters.map((c) => (
              <Chip key={c} ch={c} pressed={activeCh === c} onClick={() => setChapter(activeCh === c ? null : c)} count={chCounts[c]}>{chapterShort(state, c)}</Chip>
            ))}
          </Chips>
        )}
        {tags.length > 0 && (
          <Chips>
            {activeTag && <Chip onClick={() => setTag(null)}>All tags</Chip>}
            {tags.map((t) => (
              <Chip key={t} pressed={activeTag === t} onClick={() => setTag(activeTag === t ? null : t)} count={tagCounts[t]}>#{t}</Chip>
            ))}
          </Chips>
        )}
        {days.length
          ? days.map(([k, items]) => (
              <div key={k} className="mb-5">
                <h3 className="mb-2 text-small font-bold text-muted-foreground">{dayTitle(k)}</h3>
                <List>{items.map((b) => <FindCard key={b.id} b={b} onTag={setTag} />)}</List>
              </div>
            ))
          : empty(state.bookmarks.length ? 'No finds match.' : 'Nothing saved yet. Tap + or send a link to your bot.')}
        {shown.length > limit && <div ref={more} className="empty">Loading more…</div>}
      </Section>
      {adding && <FindSheet open={adding} onOpenChange={setAdding} tags={tags} />}
    </>
  )
}
