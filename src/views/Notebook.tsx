import { useEffect, useMemo, useRef, useState } from 'react'
import { ExternalLink, Lightbulb } from 'lucide-react'
import { topicName, topicOf, topics as allTopics } from '@/lib/content'
import { addDays, fmtLong, fmtStamp, keyOf, parseKey } from '@/lib/dates'
import { cleanTag, findUrls, hostOf, kindFromUrl, kindName, youtubeId } from '@/lib/finds'
import type { TopicId, Note } from '@/lib/types'
import { useNotes, useStore } from '@/store/StoreProvider'
import { Linkify } from '@/components/guide'
import { AreaField, TopicField, FormSheet, LinesField, PlusButton, RemoveButton, fail } from '@/components/edit'
import { usePageBar } from '@/components/bar'
import { Chip, ChipsList, Dot, Entry, Header, List, SearchField, useDebouncedValue } from '@/components/kit'


function dayTitle(key: string) {
  const today = new Date()
  if (key === keyOf(today)) return 'Today'
  if (key === keyOf(addDays(today, -1))) return 'Yesterday'
  return fmtLong(parseKey(key))
}

// Offered under Tags: the tags you'd use most.
const QUICK_TAGS = ['todo', 'idea']

const blank = (topic: TopicId | null): Note => ({
  id: crypto.randomUUID(), type: 'note', body: '', url: null, kind: null, context: '', tags: [],
  topic, source: 'app', created_at: new Date().toISOString(),
})

// New or existing entry: one text box. If it holds a link the entry is a link: on save the link is
// taken out and kept as the entry's link, and the rest is the note about it. Ideas are marked by the bot's AI.
// From a topic page a new entry belongs to that topic, so there's no topic picker.
export function NoteSheet({ open, onOpenChange, note, topic }: { open: boolean; onOpenChange: (o: boolean) => void; note?: Note; topic?: TopicId }) {
  const { state, dispatch } = useStore()
  const [n, setN] = useState<Note>(() => {
    // Every entry has a topic: Personal unless added from a topic page (or saved by the bot without one).
    const own = topicOf(state, 'own') ? 'own' : null
    const x = note ? { ...note, topic: note.topic ?? own } : blank(topic ?? own)
    return x.url ? { ...x, body: x.body ? `${x.url}\n${x.body}` : x.url } : x
  })
  const set = (patch: Partial<Note>) => setN({ ...n, ...patch })
  const url = findUrls(n.body)[0] ?? null
  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title="Notebook" submit="Save"
      onSubmit={() => {
        if (!n.body.trim()) return fail('Write something first.')
        const isLink = !!url
        // A link decides the type; otherwise #idea makes it an idea, and anything else is a note.
        const type = isLink ? 'link' : n.tags.includes('idea') ? 'idea' : 'note'
        dispatch({ type: 'putNote', note: {
          ...n, type, body: (isLink ? n.body.replace(url!, '') : n.body).trim(),
          url: isLink ? url : null, kind: isLink ? (url === note?.url && n.kind) || kindFromUrl(url!) || 'site' : null,
        } })
      }}>
      <AreaField label="Note" value={n.body} rows={5} onChange={(body) => set({ body })}
        placeholder="An insight, an idea, or paste a link with why it's interesting" />
      {n.context && (
        <div className="field span-all">
          <span className="text-small font-bold">AI context</span>
          <div className="nb-context">{n.context}</div>
          <span className="text-caption text-muted-foreground">Written by the AI when the bot saved this. You can't edit it.</span>
        </div>
      )}
      {!(topic && !note) && <TopicField value={n.topic} onChange={(c) => set({ topic: c })} />}
      <LinesField label="Tags" value={n.tags} placeholder="A tag" quick={QUICK_TAGS}
        onChange={(ts) => set({ tags: [...new Set(ts.map(cleanTag).filter(Boolean))] })} />
    </FormSheet>
  )
}

// One entry: a link shows its page, an idea its title and details, a note its text. Tapping the card (not a link) edits it.
// removable: edit mode, with the ⊖ to delete it.
export function NoteCard({ n, onOpen, onTag, showTopic = true, removable }: { n: Note; onOpen: () => void; onTag?: (t: string) => void; showTopic?: boolean; removable?: boolean }) {
  const { state, dispatch } = useStore()
  const yt = n.url ? youtubeId(n.url) : null
  return (
    <Entry ch={n.topic} onEdit={onOpen} editLabel={`Edit ${n.body.slice(0, 40) || (n.url ? hostOf(n.url) : 'entry')}`}
      remove={removable && <RemoveButton label="Delete entry" title="Delete this entry?" description="It's removed from your notebook for good." onConfirm={() => dispatch({ type: 'deleteNote', id: n.id })} />}>
      <div className="nb-card">
        {n.type === 'link' && n.url && (
          <div className="nb-link">
            {yt && <img className="nb-thumb" src={`https://i.ytimg.com/vi/${yt}/mqdefault.jpg`} alt="" loading="lazy" />}
            <div className="min-w-0">
              <a href={n.url} target="_blank" rel="noreferrer" className="res-title nb-title">{hostOf(n.url)}<ExternalLink className="res-ext" aria-label="opens in a new tab" /></a>
              {n.kind && <div className="nb-sub">{kindName(n.kind)}</div>}
            </div>
          </div>
        )}
        {n.context && <div className="nb-context"><div className="line-clamp-3">{n.context}</div></div>}
        {n.body && (n.type === 'idea'
          ? <div className="note-text nb-idea"><Lightbulb aria-hidden="true" /><span><Linkify text={n.body} /></span></div>
          : <div className={`note-text${n.type === 'link' ? ' nb-quote' : ''}`}><Linkify text={n.body} /></div>)}
        <div className="note-meta nb-meta">
          {showTopic && n.topic && <span className="inline-flex items-center gap-1"><Dot />{topicName(state, n.topic)}</span>}
          {n.tags.map((t) => onTag
            ? <button key={t} type="button" className="nb-tag" onClick={() => onTag(t)}>#{t}</button>
            : <span key={t} className="nb-tag">#{t}</span>)}
          <span>{fmtStamp(n.created_at)}</span>
          {n.source === 'telegram' && <span>via Telegram</span>}
        </div>
      </div>
    </Entry>
  )
}

// Lazy loading: put the returned ref on an element after the list; the next page loads as it scrolls into view.
export function useLoadMore(q: ReturnType<typeof useNotes>) {
  const ref = useRef<HTMLDivElement>(null)
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = q
  useEffect(() => {
    const el = ref.current
    if (!el || !hasNextPage) return
    const io = new IntersectionObserver((es) => { if (es[0].isIntersecting && !isFetchingNextPage) void fetchNextPage() }, { rootMargin: '400px' })
    io.observe(el)
    return () => io.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])
  return ref
}

export function Notebook() {
  const { state } = useStore()
  const [sheet, setSheet] = useState<{ note?: Note } | null>(null)
  const [topic, setTopic] = useState<TopicId | null>(null)
  const [query, setQuery] = useState('')
  const [edit, setEdit] = useState(false)
  const q = useDebouncedValue(query.trim(), 250)
  const notes = useNotes({ topic, q })
  const items = useMemo(() => notes.data?.pages.flat() ?? [], [notes.data])
  const more = useLoadMore(notes)
  usePageBar({ edit: items.length ? () => setEdit(true) : undefined, done: edit ? () => setEdit(false) : undefined })

  const days = useMemo(() => {
    const by = new Map<string, Note[]>()
    for (const n of items) {
      const k = keyOf(new Date(n.created_at))
      by.set(k, [...(by.get(k) ?? []), n])
    }
    return [...by.entries()]
  }, [items])
  const filtered = !!topic || !!q
  // A tapped tag on a card goes into the search box, which finds #tags exactly.
  const onTag = (t: string) => setQuery(`#${t}`)

  return (
    <>
      <Header title="Notebook" lead="Notes, ideas and links in one place. Add them here, or send them to your Telegram bot.">
        <PlusButton label="Add a note, idea or link" onClick={() => setSheet({})} />
      </Header>
      <SearchField label="Search your notebook" value={query} onChange={setQuery} placeholder="Search by text, link or #tag" />
      <ChipsList label="Filter">
        <Chip pressed={!topic} onClick={() => setTopic(null)}>All</Chip>
        {/* Personal and the roadmap topics; wellbeing habits aren't topics, so they get no chip. */}
        {[...allTopics(state, 'general'), ...allTopics(state, 'learn')].map((c) => (
          <Chip key={c.id} ch={c.id} pressed={topic === c.id} onClick={() => setTopic(topic === c.id ? null : c.id)}>{c.name}</Chip>
        ))}
      </ChipsList>
      {notes.isPending
        ? <List empty="Loading…" />
        : days.length
          ? days.map(([k, list]) => (
              <section key={k} className="mb-5">
                <h3 className="mb-2 text-small font-bold text-muted-foreground">{dayTitle(k)}</h3>
                <List>{list.map((n) => <NoteCard key={n.id} n={n} onOpen={() => setSheet({ note: n })} onTag={onTag} removable={edit} />)}</List>
              </section>
            ))
          : <List empty={filtered ? 'Nothing matches.' : 'Nothing here yet. Tap + to add a note, an idea or a link.'} />}
      {notes.hasNextPage && <div ref={more} className="empty">{notes.isFetchingNextPage ? 'Loading more…' : ''}</div>}
      {sheet && <NoteSheet open onOpenChange={(o) => !o && setSheet(null)} note={sheet.note} />}
    </>
  )
}
