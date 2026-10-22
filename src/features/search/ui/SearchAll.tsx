import { useState } from 'react'
import type { Note } from '@core/domain/types'
import { search } from '@core/domain/search'
import { useNotes, useStore } from '@/shared/store/StoreProvider'
import { List, Section, empty, useDebouncedValue } from '@/shared/ui'
import { t } from '@/shared/i18n'
import { NoteCard, NoteSheet } from '@/features/notes'
import { useOpenHit } from '../model/use-open-hit'
import { SearchResults } from './SearchResults'

/**
 * Results for a query over everything: topics (and their skills, steps, resources, projects), lists and their
 * items, tasks, habits and the notebook. A result opens where it lives (`onPick` runs first); a note opens its
 * form right here. Used by the search sheet and the phone's More page.
 */
export function SearchAll({ query, onPick }: { query: string; onPick?: () => void }) {
  const [editing, setEditing] = useState<Note | null>(null)
  const q = useDebouncedValue(query.trim(), 200)
  const { state } = useStore()
  const openHit = useOpenHit()
  const hits = search.inState(state, q)
  const notes = useNotes({ q }, !!q)
  const noteHits = q ? notes.data?.pages.flat().slice(0, 8) ?? [] : []
  return (
    <div className="search-results">
      {q && !hits.length && !noteHits.length && !notes.isFetching && empty(t.search.nothing)}
      <SearchResults hits={hits} onPick={(h) => { onPick?.(); void openHit(h) }} />
      {noteHits.length > 0 && (
        <Section title={t.search.kinds.note}>
          <List>{noteHits.map((n) => <NoteCard key={n.id} n={n} onOpen={() => setEditing(n)} />)}</List>
        </Section>
      )}
      {editing && <NoteSheet open onOpenChange={(o) => !o && setEditing(null)} note={editing} />}
    </div>
  )
}
