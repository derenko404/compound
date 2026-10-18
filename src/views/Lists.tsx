import { useState, type CSSProperties } from 'react'
import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { NotebookPen, Pencil, Trash2 } from 'lucide-react'
import { usePageBar } from '@/components/bar'
import { byPosition, freshId, nextPosition, uid } from '@/lib/content'
import type { ListDef, ListDefItem, State } from '@/lib/types'
import { useStore } from '@/store/StoreProvider'
import { celebrate, toast } from '@/fx/fx'
import { Check, Chip, ChipsList, Header, LinkCard, List, Progress, Row, SearchField } from '@/components/kit'
import { AreaField, ConfirmSheet, FormSheet, PlusButton, RowEdit, TextField, fail, move, useSheet } from '@/components/edit'

type Filter = 'all' | 'todo' | 'done'

function ListSheet({ list, open, onOpenChange, onSaved, onDeleted }: { list: ListDef; open: boolean; onOpenChange: (o: boolean) => void; onSaved: (id: string) => void; onDeleted?: () => void }) {
  const { state, dispatch } = useStore()
  const [l, setL] = useState(list)
  const isNew = !list.id
  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title={isNew ? 'New list' : `Edit ${list.name}`} submit={isNew ? 'Create list' : 'Save'}
      onDelete={isNew ? undefined : () => { dispatch({ type: 'deleteList', id: list.id }); toast('List deleted.'); onDeleted?.() }}
      confirmDelete={{ title: `Delete ${list.name}?`, description: "Its items, ticks and notes go with it. This can't be undone." }}
      onSubmit={() => {
        if (!l.name.trim()) return fail('Give the list a name first.')
        const id = l.id || freshId(l.name, state.lists.map((x) => x.id))
        dispatch({ type: 'putList', list: { ...l, id, name: l.name.trim(), title: l.title.trim() || l.name.trim(), sub_label: l.sub_label.trim() } })
        onSaved(id)
      }}>
      <div className="grid2">
        <TextField label="Short name" value={l.name} onChange={(name) => setL({ ...l, name })} placeholder="📚 Books" required />
        <TextField label="Detail under each item" value={l.sub_label} onChange={(sub_label) => setL({ ...l, sub_label })} placeholder="Author" hint="Like the author for books, the year for films, the artist for songs" />
      </div>
      <TextField label="Title" value={l.title} onChange={(title) => setL({ ...l, title })} placeholder="100 books everyone should read" full />
    </FormSheet>
  )
}

function ItemSheet({ list, item, open, onOpenChange }: { list: ListDef; item: ListDefItem; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { dispatch } = useStore()
  const [it, setIt] = useState(item)
  const isNew = !list.items.some((x) => x.id === item.id)
  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title={isNew ? `Add to ${list.name}` : 'Edit item'} submit={isNew ? 'Add' : 'Save'}
      onDelete={isNew ? undefined : () => dispatch({ type: 'putList', list: { ...list, items: list.items.filter((x) => x.id !== item.id) } })}
      onSubmit={() => {
        if (!it.title.trim()) return fail('Give it a title first.')
        const next = { ...it, title: it.title.trim(), sub: it.sub?.trim() || undefined }
        dispatch({ type: 'putList', list: { ...list, items: isNew ? [...list.items, next] : list.items.map((x) => (x.id === it.id ? next : x)) } })
        toast(isNew ? 'Added.' : 'Saved.')
      }}>
      <TextField label="Title" value={it.title} onChange={(title) => setIt({ ...it, title })} required full />
      <TextField label={list.sub_label || 'Details'} value={it.sub ?? ''} onChange={(sub) => setIt({ ...it, sub })} full />
    </FormSheet>
  )
}

const blankList = (lists: ListDef[]): ListDef => ({ id: '', position: nextPosition(lists), name: '', title: '', sub_label: '', items: [] })

const doneIn = (s: State, l: ListDef) => l.items.filter((i) => s.listProgress[l.id]?.[i.id]?.done_at).length

// A note on one item: its own sheet, so rows stay one line tall.
function NoteSheet({ list, item, open, onOpenChange }: { list: ListDef; item: ListDefItem; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { state, dispatch } = useStore()
  const p = state.listProgress[list.id]?.[item.id] ?? {}
  const [note, setNote] = useState(p.note ?? '')
  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title={item.title} description={item.sub} submit="Save"
      onSubmit={() => {
        dispatch({ type: 'listItem', list: list.id, item: item.id, progress: { ...p, note: note.trim() || null } })
        toast(note.trim() ? 'Note saved.' : 'Note removed.')
      }}>
      <AreaField label="Note" value={note} onChange={setNote} rows={4} placeholder="Thoughts, rating, when and where" />
    </FormSheet>
  )
}

/* ---------- All lists ---------- */

export function Lists() {
  const { state } = useStore()
  const nav = useNavigate()
  const lists = byPosition(state.lists)
  const listSheet = useSheet<ListDef>()
  return (
    <>
      <Header title="Lists" lead="Books to read, films to watch, places to go.">
        <PlusButton label="New list" onClick={() => listSheet.open(blankList(lists))} />
      </Header>
      {lists.length ? (
        <div className="card-grid" style={{ '--c': 'var(--primary)' } as CSSProperties}>
          {lists.map((l) => {
            const n = doneIn(state, l)
            return (
              <LinkCard key={l.id} to="/lists/$id" params={{ id: l.id }} title={l.name}
                sub={<span className="grid gap-2"><span>{l.title}</span><Progress n={n} total={l.items.length} /></span>} />
            )
          })}
        </div>
      ) : <List empty="No lists yet. Start one with +." />}
      {listSheet.value && <ListSheet key="new" {...listSheet.props} list={listSheet.value} onSaved={(id) => void nav({ to: '/lists/$id', params: { id } })} />}
    </>
  )
}

/* ---------- One list ---------- */

const route = getRouteApi('/lists/$id')

export function ListPage() {
  const { id } = route.useParams()
  const { state, dispatch } = useStore()
  const nav = useNavigate()
  const L = state.lists.find((l) => l.id === id)
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [edit, setEdit] = useState(false)
  const listSheet = useSheet<ListDef>()
  const itemSheet = useSheet<ListDefItem>()
  const noteSheet = useSheet<ListDefItem>()
  const [deleting, setDeleting] = useState(false)
  usePageBar({
    back: { to: '/lists', label: 'Lists' },
    actions: L ? [
      { label: 'Edit', icon: Pencil, onSelect: () => setEdit(true) },
      { label: 'Delete list', icon: Trash2, onSelect: () => setDeleting(true), danger: true },
    ] : [],
    done: edit ? () => setEdit(false) : undefined,
  })
  if (!L) return <List empty="This list no longer exists." />

  const items = state.listProgress[L.id] ?? {}
  const n = doneIn(state, L)
  const q = query.toLowerCase()

  const toggle = (item: string, on: boolean) => {
    dispatch({ type: 'listItem', list: L.id, item, progress: { ...items[item], done_at: on ? new Date().toISOString() : null } })
    if (!on) return
    const next = n + 1
    if (next % 10 === 0) {
      setTimeout(celebrate, 200)
      toast(`${next} of ${L.items.length} ${L.name.toLowerCase()}. Milestone.`)
    }
  }

  const rows = L.items.map((it, idx) => {
    const p = items[it.id] ?? {}
    const on = !!p.done_at
    if (!edit && ((filter === 'done' && !on) || (filter === 'todo' && on))) return null
    const note = p.note ?? ''
    if (q && !`${it.title} ${it.sub ?? ''} ${note}`.toLowerCase().includes(q)) return null
    return (
      <Row key={it.id} done={on} style={{ '--c': 'var(--primary)' } as CSSProperties}
        title={<><span className="font-normal tabular-nums text-muted-foreground">{idx + 1}.</span> {it.title}</>}
        sub={it.sub} note={note} tagInline
        check={<Check on={on} label={it.title} onToggle={(v) => toggle(it.id, v)} />}
        tag={edit
          ? <RowEdit label={it.title} onEdit={() => itemSheet.open(it)}
              onUp={idx > 0 ? () => dispatch({ type: 'putList', list: { ...L, items: move(L.items, idx, -1) } }) : undefined}
              onDown={idx < L.items.length - 1 ? () => dispatch({ type: 'putList', list: { ...L, items: move(L.items, idx, 1) } }) : undefined} />
          : <button type="button" className={`icon-btn${note ? ' on' : ''}`} aria-label={note ? `Edit note for ${it.title}` : `Add a note to ${it.title}`} onClick={() => noteSheet.open(it)}>
              <NotebookPen aria-hidden="true" />
            </button>} />
    )
  }).filter(Boolean)

  return (
    <>
      <Header title={L.name} lead={L.title} action={edit ? { label: `Edit ${L.name}'s name and title`, icon: Pencil, onClick: () => listSheet.open(L) } : undefined}>
        <PlusButton label={`Add to ${L.name}`} onClick={() => itemSheet.open({ id: uid(), title: '' })} />
      </Header>
      <div className="mb-4"><Progress n={n} total={L.items.length} /></div>
      <SearchField value={query} onChange={setQuery} placeholder={`Search ${L.name.toLowerCase()}`} />
      {!edit && (
        <ChipsList label="Show">
          {(['all', 'todo', 'done'] as Filter[]).map((f) => (
            <Chip key={f} pressed={filter === f} onClick={() => setFilter(f)}>{{ all: 'All', todo: 'Still to do', done: 'Done' }[f]}</Chip>
          ))}
        </ChipsList>
      )}
      <List empty={L.items.length ? 'Nothing here with this filter.' : 'This list is empty. Tap + to add items.'}>{rows}</List>
      <ConfirmSheet open={deleting} onOpenChange={setDeleting} title={`Delete ${L.name}?`}
        description="Its items, ticks and notes go with it. This can't be undone."
        onConfirm={() => {
          dispatch({ type: 'deleteList', id: L.id })
          toast(`${L.name} deleted.`)
          void nav({ to: '/lists' })
        }} />
      {listSheet.value && <ListSheet key={listSheet.value.id} {...listSheet.props} list={listSheet.value} onSaved={() => {}}
        onDeleted={() => void nav({ to: '/lists' })} />}
      {itemSheet.value && <ItemSheet key={itemSheet.value.id} {...itemSheet.props} list={L} item={itemSheet.value} />}
      {noteSheet.value && <NoteSheet key={noteSheet.value.id} {...noteSheet.props} list={L} item={noteSheet.value} />}
    </>
  )
}
