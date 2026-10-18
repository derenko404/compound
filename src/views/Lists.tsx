import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { byPosition, freshId, nextPosition, uid } from '@/lib/content'
import type { ListDef, ListDefItem } from '@/lib/types'
import { useStore } from '@/store/StoreProvider'
import { celebrate, praise, toast } from '@/fx/fx'
import { Banner, Check, Chip, Chips, Dial, Header, List, Row, SearchField, useDebounced } from '@/components/kit'
import { EditToggle, FormSheet, PlusButton, RowEdit, TextField, fail, move, useSheet } from '@/components/edit'

type Filter = 'all' | 'todo' | 'done'

function ListSheet({ list, open, onOpenChange, onSaved }: { list: ListDef; open: boolean; onOpenChange: (o: boolean) => void; onSaved: (id: string) => void }) {
  const { state, dispatch } = useStore()
  const [l, setL] = useState(list)
  const isNew = !list.id
  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title={isNew ? 'New list' : `Edit ${list.name}`} submit={isNew ? 'Create list' : 'Save'}
      onDelete={isNew ? undefined : () => { dispatch({ type: 'deleteList', id: list.id }); toast('List deleted.') }}
      onSubmit={() => {
        if (!l.name.trim()) return fail('Give the list a name first.')
        const id = l.id || freshId(l.name, state.lists.map((x) => x.id))
        dispatch({ type: 'putList', list: { ...l, id, name: l.name.trim(), title: l.title.trim() || l.name.trim(), sub_label: l.sub_label.trim() } })
        onSaved(id)
      }}>
      <div className="grid2">
        <TextField label="Short name" value={l.name} onChange={(name) => setL({ ...l, name })} placeholder="Books" required />
        <TextField label="Second column" value={l.sub_label} onChange={(sub_label) => setL({ ...l, sub_label })} placeholder="Author" hint="Author, year, artist, country…" />
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

export function Lists() {
  const { state, dispatch } = useStore()
  const lists = byPosition(state.lists)
  const [selId, setSel] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [edit, setEdit] = useState(false)
  const [openNotes, setOpenNotes] = useState<Set<string>>(new Set())
  const listSheet = useSheet<ListDef>()
  const itemSheet = useSheet<ListDefItem>()
  const L = lists.find((l) => l.id === selId) ?? lists[0]
  const progress = (id: string) => state.listProgress[id] ?? {}
  const doneCount = (l: ListDef) => l.items.filter((i) => progress(l.id)[i.id]?.done_at).length
  const saveNote = useDebounced(({ list, item, note }: { list: string; item: string; note: string }) => {
    dispatch({ type: 'listItem', list, item, progress: { ...state.listProgress[list]?.[item], note: note.trim() ? note : null } })
  })

  const header = (
    <Header title={L?.title ?? 'Lists'} lead="Tick what you've done and keep a note on each one. Edit any list, or start your own.">
      <div className="flex items-center gap-2">
        {L && <Dial n={doneCount(L)} total={L.items.length} sub={`of ${L.items.length}`} />}
      </div>
    </Header>
  )
  const sheets = (
    <>
      {listSheet.value && <ListSheet key={listSheet.value.id || 'new'} {...listSheet.props} list={listSheet.value} onSaved={setSel} />}
      {itemSheet.value && L && <ItemSheet key={itemSheet.value.id} {...itemSheet.props} list={L} item={itemSheet.value} />}
    </>
  )

  const chips = (
    <Chips className="items-center">
      {lists.map((l) => (
        <Chip key={l.id} pressed={L?.id === l.id} onClick={() => { setSel(l.id); setQuery('') }} count={`${doneCount(l)}/${l.items.length}`}>{l.name}</Chip>
      ))}
      <PlusButton label="New list" onClick={() => listSheet.open(blankList(lists))} />
    </Chips>
  )

  if (!L) return <>{header}{chips}<List empty="No lists yet. Start one with +." />{sheets}</>

  const items = progress(L.id)
  const n = doneCount(L)
  const q = query.toLowerCase()

  const toggle = (item: string, on: boolean) => {
    dispatch({ type: 'listItem', list: L.id, item, progress: { ...items[item], done_at: on ? new Date().toISOString() : null } })
    if (!on) return
    const next = n + 1
    if (next % 10 === 0) {
      setTimeout(celebrate, 200)
      toast(`${next} of ${L.items.length} ${L.name.toLowerCase()}. Milestone.`)
    } else toast(praise())
  }

  const rows = L.items.map((it, idx) => {
    const p = items[it.id] ?? {}
    const on = !!p.done_at
    if (!edit && ((filter === 'done' && !on) || (filter === 'todo' && on))) return null
    const note = p.note ?? ''
    if (q && !`${it.title} ${it.sub ?? ''} ${note}`.toLowerCase().includes(q)) return null
    const key = L.id + it.id
    const showNote = !edit && (!!note || openNotes.has(key))
    return (
      <Row key={key} done={on} style={{ '--c': 'var(--primary)' } as React.CSSProperties}
        title={<><span className="font-normal tabular-nums text-muted-foreground">{idx + 1}.</span> {it.title}</>}
        sub={it.sub}
        check={<Check on={on} label={it.title} onToggle={(v) => toggle(it.id, v)} />}
        tag={edit
          ? <RowEdit label={it.title} onEdit={() => itemSheet.open(it)}
              onUp={idx > 0 ? () => dispatch({ type: 'putList', list: { ...L, items: move(L.items, idx, -1) } }) : undefined}
              onDown={idx < L.items.length - 1 ? () => dispatch({ type: 'putList', list: { ...L, items: move(L.items, idx, 1) } }) : undefined}
              onDelete={() => dispatch({ type: 'putList', list: { ...L, items: L.items.filter((x) => x.id !== it.id) } })} />
          : showNote ? null : <Button variant="outline" size="sm" onClick={() => setOpenNotes(new Set(openNotes).add(key))}>Note</Button>}>
        {showNote && (
          <Input className="mt-2 bg-background" autoFocus={!note} defaultValue={note} aria-label={`Note for ${it.title}`}
            placeholder="Your note: thoughts, rating, when and where" onChange={(e) => saveNote({ list: L.id, item: it.id, note: e.target.value })} />
        )}
      </Row>
    )
  }).filter(Boolean)

  return (
    <>
      {header}
      {chips}
      <div className="actions mb-4 mt-0">
        <SearchField className="flex-[1_1_220px]" value={query} onChange={setQuery} placeholder={`Title, ${(L.sub_label || 'details').toLowerCase()} or note`} />
        <Chips className="m-0 self-end">
          {!edit && (['all', 'todo', 'done'] as Filter[]).map((f) => (
            <Chip key={f} pressed={filter === f} onClick={() => setFilter(f)}>{{ all: 'All', todo: 'Still to do', done: 'Done' }[f]}</Chip>
          ))}
          <EditToggle on={edit} onChange={setEdit} />
        </Chips>
      </div>
      {edit && (
        <Banner actions={<>
          <Chip onClick={() => listSheet.open(L)}>List name and title</Chip>
          <PlusButton label="Add item" onClick={() => itemSheet.open({ id: uid(), title: '' })} />
        </>}>
          Editing {L.name}. Ticks and notes stay with each item.
        </Banner>
      )}
      <List empty={L.items.length ? 'Nothing here with this filter.' : 'This list is empty. Tap Edit, then + to add items.'}>{rows}</List>
      {sheets}
    </>
  )
}
