import { useState } from 'react'
import { chapterName, chapters } from '@/lib/content'
import { fmtStamp } from '@/lib/dates'
import type { ChapterId } from '@/lib/types'
import { useStore } from '@/store/StoreProvider'
import { toast } from '@/fx/fx'
import { Chip, Chips, ConfirmButton, Dot, Entry, Header, List, Section } from '@/components/kit'
import { AreaField, ChapterField, FormSheet, PlusButton, fail } from '@/components/edit'

function NoteSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { dispatch } = useStore()
  const [text, setText] = useState('')
  const [ch, setCh] = useState<ChapterId | null>('own')
  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title="New note" submit="Save note"
      onSubmit={() => {
        if (!text.trim()) return fail('Write something first.')
        dispatch({ type: 'addNote', note: { id: crypto.randomUUID(), chapter: ch ?? 'own', body: text.trim(), created_at: new Date().toISOString() } })
        toast('Note saved.')
      }}>
      <AreaField label="Note" value={text} onChange={setText} rows={5} placeholder="An insight, a link, a question for later…" />
      <ChapterField value={ch} onChange={setCh} />
    </FormSheet>
  )
}

export function Notes() {
  const { state, dispatch } = useStore()
  const [adding, setAdding] = useState(false)
  const [filter, setFilter] = useState<ChapterId | null>(null)
  const counts: Record<string, number> = {}
  for (const n of state.notes) counts[n.chapter] = (counts[n.chapter] || 0) + 1
  const used = chapters(state).filter((c) => counts[c.id])
  const shown = state.notes.filter((n) => !filter || n.chapter === filter)

  return (
    <>
      <Header title="Notes" lead="Write down what you learn. Notes also arrive from your Telegram bot.">
        <PlusButton label="New note" onClick={() => setAdding(true)} />
      </Header>
      {used.length > 1 && (
        <Chips>
          <Chip pressed={!filter} onClick={() => setFilter(null)} count={state.notes.length}>All</Chip>
          {used.map((c) => (
            <Chip key={c.id} ch={c.id} pressed={filter === c.id} onClick={() => setFilter(filter === c.id ? null : c.id)} count={counts[c.id]}>{c.short}</Chip>
          ))}
        </Chips>
      )}
      <Section title="Your notes" aside={shown.length}>
        <List empty="No notes yet. Add one with +.">
          {shown.map((n) => (
            <Entry key={n.id} ch={n.chapter} meta={<>
              <Dot /><span>{chapterName(state, n.chapter)}</span><span>{fmtStamp(n.created_at)}</span>
              <ConfirmButton label="Delete" armed="Tap again to delete" onConfirm={() => { dispatch({ type: 'deleteNote', id: n.id }); toast('Deleted.') }} />
            </>}>
              <div className="note-text">{n.body}</div>
            </Entry>
          ))}
        </List>
      </Section>
      {adding && <NoteSheet open={adding} onOpenChange={setAdding} />}
    </>
  )
}
