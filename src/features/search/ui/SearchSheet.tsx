import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/shared/ui/primitives/dialog'
import { SearchField } from '@/shared/ui'
import { t } from '@/shared/i18n'
import { searchSheet, useSearchOpen } from '../model/search-open'
import { SearchAll } from './SearchAll'

// The app-wide search: a sheet on wider screens, a full page on phones (results in SearchAll). ⌘K / Ctrl K opens it.
export function SearchSheet() {
  const open = useSearchOpen()
  const [query, setQuery] = useState('')

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
    <Dialog open={open} onOpenChange={(o) => { searchSheet.set(o); if (!o) setQuery('') }}>
      <DialogContent className="search-sheet sheet-wide">
        <DialogTitle>{t.search.title}</DialogTitle>
        <DialogDescription className="sr-only">{t.search.hint}</DialogDescription>
        <div className="search-row">
          <SearchField value={query} onChange={setQuery} placeholder={t.search.placeholder} label={t.search.title} autoFocus />
          {/* Phones: search fills the screen, and Cancel closes it (as on iOS). */}
          <button type="button" className="search-cancel" onClick={() => { searchSheet.close(); setQuery('') }}>{t.common.cancel}</button>
        </div>
        {query.trim()
          ? <SearchAll query={query} onPick={() => { searchSheet.close(); setQuery('') }} />
          : <p className="text-small text-muted-foreground">{t.search.hint}</p>}
      </DialogContent>
    </Dialog>
  )
}
