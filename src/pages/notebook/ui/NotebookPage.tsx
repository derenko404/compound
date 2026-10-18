import { useMemo, useState } from 'react'
import { topics as allTopics } from '@core/domain/content'
import { dates } from '@/shared/lib/dates'
import type { TopicId, Note } from '@core/domain/types'
import { useNotes, useStore } from '@/shared/store/StoreProvider'
import { useLoadMore } from '@/shared/lib/useLoadMore'
import { NoteCard } from '@/features/notes'
import { NoteSheet } from '@/features/notes'
import { usePageBar, Chip, ChipsList, Header, List, SearchField, useDebouncedValue } from '@/shared/ui'
import { t } from '@/shared/i18n'


function dayTitle(key: string) {
  const today = new Date()
  if (key === dates.keyOf(today)) return t.notebook.today
  if (key === dates.keyOf(dates.addDays(today, -1))) return t.notebook.yesterday
  return dates.fmtLong(dates.parseKey(key))
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
  usePageBar({ add: { label: t.notebook.add, onClick: () => setSheet({}) }, edit: items.length ? () => setEdit(true) : undefined, done: edit ? () => setEdit(false) : undefined })

  const days = useMemo(() => {
    const by = new Map<string, Note[]>()
    for (const n of items) {
      const k = dates.keyOf(new Date(n.created_at))
      by.set(k, [...(by.get(k) ?? []), n])
    }
    return [...by.entries()]
  }, [items])
  const filtered = !!topic || !!q
  // A tapped tag on a card goes into the search box, which finds #tags exactly.
  const onTag = (tag: string) => setQuery(`#${tag}`)

  return (
    <>
      <Header title={t.notebook.title} lead={t.notebook.lead} />
      <SearchField label={t.notebook.searchLabel} value={query} onChange={setQuery} placeholder={t.notebook.searchPlaceholder} />
      <ChipsList label={t.notebook.filter}>
        <Chip pressed={!topic} onClick={() => setTopic(null)}>{t.notebook.all}</Chip>
        {/* Personal and the roadmap topics; wellbeing habits aren't topics, so they get no chip. */}
        {[...allTopics(state, 'general'), ...allTopics(state, 'learn')].map((c) => (
          <Chip key={c.id} ch={c.id} pressed={topic === c.id} onClick={() => setTopic(topic === c.id ? null : c.id)}>{c.name}</Chip>
        ))}
      </ChipsList>
      {notes.isPending
        ? <List empty={t.common.loading} />
        : days.length
          ? days.map(([k, list]) => (
              <section key={k} className="mb-5">
                <h3 className="mb-2 text-small font-bold text-muted-foreground">{dayTitle(k)}</h3>
                <List>{list.map((n) => <NoteCard key={n.id} n={n} onOpen={() => setSheet({ note: n })} onTag={onTag} removable={edit} />)}</List>
              </section>
            ))
          : <List empty={filtered ? t.common.nothingMatches : t.notebook.empty} />}
      {notes.hasNextPage && <div ref={more} className="empty">{notes.isFetchingNextPage ? t.common.loadingMore : ''}</div>}
      {sheet && <NoteSheet open onOpenChange={(o) => !o && setSheet(null)} note={sheet.note} />}
    </>
  )
}
