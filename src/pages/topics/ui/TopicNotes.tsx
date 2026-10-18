import { List } from '@/shared/ui'
import type { Note } from '@core/domain/types'
import { useNotes } from '@/shared/store/StoreProvider'
import { t } from '@/shared/i18n'
import { NoteCard } from '@/features/notes'
import { useLoadMore } from '@/shared/lib/useLoadMore'

// The topic's notebook entries, loaded 10 at a time like the Notebook page.
export function TopicNotes({ ch, onOpen, edit }: { ch: string; onOpen: (n: Note) => void; edit?: boolean }) {
  const notes = useNotes({ topic: ch })
  const items = notes.data?.pages.flat() ?? []
  const more = useLoadMore(notes)
  return (
    <>
      <List empty={notes.isPending ? t.common.loading : t.topics.page.notesEmpty}>
        {items.map((n) => <NoteCard key={n.id} n={n} showTopic={false} onOpen={() => onOpen(n)} removable={edit} />)}
      </List>
      {notes.hasNextPage && <div ref={more} className="empty">{notes.isFetchingNextPage ? t.common.loadingMore : ''}</div>}
    </>
  )
}
