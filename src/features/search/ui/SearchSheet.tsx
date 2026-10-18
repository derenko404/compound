import { useEffect, useState } from 'react'
import type { Note } from '@core/domain/types'
import { search } from '@core/domain/search'
import { useNotes, useStore } from '@/shared/store/StoreProvider'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/shared/ui/primitives/dialog'
import { List, SearchField, Section, empty, useDebouncedValue } from '@/shared/ui'
import { t } from '@/shared/i18n'
import { NoteCard, NoteSheet } from '@/features/notes'
import { searchSheet, useSearchOpen } from '../model/search-open'
import { useOpenHit } from '../model/use-open-hit'
import { SearchResults } from './SearchResults'

/**
 * The app-wide search: one field over topics (and their skills, steps, resources, projects), lists and their
 * items, tasks, habits and the notebook. A result opens where it lives; a note opens its form right here.
 * ⌘K / Ctrl K opens it from anywhere.
 */
export function SearchSheet() {
  const open = useSearchOpen()
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Note | null>(null)
  const q = useDebouncedValue(query.trim(), 200)
  const { state } = useStore()
  const openHit = useOpenHit()
  const hits = search.inState(state, q)
  const notes = useNotes({ q }, open && !!q)
  const noteHits = q ? notes.data?.pages.flat().slice(0, 8) ?? [] : []

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        searchSheet.open()
      }
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [])

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => { searchSheet.set(o); if (!o) setQuery('') }}>
        <DialogContent className="search-sheet sheet-wide">
          <DialogTitle>{t.search.title}</DialogTitle>
          <DialogDescription className="sr-only">{t.search.hint}</DialogDescription>
          <SearchField value={query} onChange={setQuery} placeholder={t.search.placeholder} label={t.search.title} autoFocus />
          <div className="search-results">
            {!q && <p className="text-small text-muted-foreground">{t.search.hint}</p>}
            {q && !hits.length && !noteHits.length && !notes.isFetching && empty(t.search.nothing)}
            <SearchResults hits={hits} onPick={(h) => { searchSheet.close(); setQuery(''); void openHit(h) }} />
            {noteHits.length > 0 && (
              <Section title={t.search.kinds.note}>
                <List>{noteHits.map((n) => <NoteCard key={n.id} n={n} onOpen={() => setEditing(n)} />)}</List>
              </Section>
            )}
          </div>
        </DialogContent>
      </Dialog>
      {editing && <NoteSheet open onOpenChange={(o) => !o && setEditing(null)} note={editing} />}
    </>
  )
}
