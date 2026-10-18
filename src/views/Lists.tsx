import { useState, type CSSProperties } from 'react'
import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { MessageSquarePlus, MessageSquareText, Pencil, Share2, Trash2 } from 'lucide-react'
import { usePageBar } from '@/components/bar'
import { byPosition, freshId, listSnapshot, nextPosition, uid } from '@/lib/content'
import { ShareSheet } from '@/components/share'
import type { ListDef, ListDefItem, State } from '@/lib/types'
import { useStore } from '@/store/StoreProvider'
import { celebrate } from '@/fx/fx'
import { Check, Chip, ChipsList, Header, LinkCard, List, Progress, Row, SortList, SearchField } from '@/components/kit'
import { AreaField, ConfirmSheet, FormSheet, RemoveButton, TextField, fail, moveTo, useSheet } from '@/components/edit'
import { t } from '@/i18n'

type Filter = 'all' | 'todo' | 'done'

function ListSheet({ list, open, onOpenChange, onSaved }: { list: ListDef; open: boolean; onOpenChange: (o: boolean) => void; onSaved: (id: string) => void }) {
  const { state, dispatch } = useStore()
  const [l, setL] = useState(list)
  const isNew = !list.id
  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title={isNew ? t.lists.newList : t.common.editNamed(list.name)} submit={isNew ? t.lists.sheet.createList : t.common.save}
      onSubmit={() => {
        if (!l.name.trim()) return fail(t.lists.sheet.nameFirst)
        const id = l.id || freshId(l.name, state.lists.map((x) => x.id))
        dispatch({ type: 'putList', list: { ...l, id, name: l.name.trim(), title: l.title.trim() || l.name.trim(), sub_label: l.sub_label.trim() } })
        onSaved(id)
      }}>
      <div className="grid2">
        <TextField label={t.lists.sheet.shortName} value={l.name} onChange={(name) => setL({ ...l, name })} placeholder={t.lists.sheet.shortNamePlaceholder} required />
        <TextField label={t.lists.sheet.detail} value={l.sub_label} onChange={(sub_label) => setL({ ...l, sub_label })} placeholder={t.lists.sheet.detailPlaceholder} hint={t.lists.sheet.detailHint} />
      </div>
      <TextField label={t.lists.sheet.title} value={l.title} onChange={(title) => setL({ ...l, title })} placeholder={t.lists.sheet.titlePlaceholder} full />
    </FormSheet>
  )
}

function ItemSheet({ list, item, open, onOpenChange }: { list: ListDef; item: ListDefItem; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { dispatch } = useStore()
  const [it, setIt] = useState(item)
  const isNew = !list.items.some((x) => x.id === item.id)
  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title={isNew ? t.lists.item.addTo(list.name) : t.lists.item.edit} submit={isNew ? t.common.add : t.common.save}
      onSubmit={() => {
        if (!it.title.trim()) return fail(t.lists.item.titleFirst)
        const next = { ...it, title: it.title.trim(), sub: it.sub?.trim() || undefined }
        dispatch({ type: 'putList', list: { ...list, items: isNew ? [...list.items, next] : list.items.map((x) => (x.id === it.id ? next : x)) } })
      }}>
      <TextField label={t.lists.item.title} value={it.title} onChange={(title) => setIt({ ...it, title })} required full />
      <TextField label={list.sub_label || t.lists.item.details} value={it.sub ?? ''} onChange={(sub) => setIt({ ...it, sub })} full />
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
    <FormSheet open={open} onOpenChange={onOpenChange} title={item.sub ? `${item.title} (${item.sub})` : item.title} submit={t.common.save}
      onSubmit={() => {
        dispatch({ type: 'listItem', list: list.id, item: item.id, progress: { ...p, note: note.trim() || null } })
      }}>
      <AreaField label={t.lists.review.label} value={note} onChange={setNote} rows={4} placeholder={t.lists.review.placeholder} />
    </FormSheet>
  )
}

/* ---------- All lists ---------- */

export function Lists() {
  const { state, dispatch } = useStore()
  const nav = useNavigate()
  const lists = byPosition(state.lists)
  const listSheet = useSheet<ListDef>()
  const [edit, setEdit] = useState(false)
  usePageBar({ add: { label: t.lists.newList, onClick: () => listSheet.open(blankList(lists)) }, edit: lists.length ? () => setEdit(true) : undefined, done: edit ? () => setEdit(false) : undefined })
  const reorder = (from: number, to: number) => {
    const ys = moveTo(lists, from, to)
    dispatch({ type: 'batch', ops: ys.flatMap((x, j) => (x.position === j ? [] : [{ type: 'putList' as const, list: { ...x, position: j } }])) })
  }
  return (
    <>
      <Header title={t.lists.title} lead={t.lists.lead} />
      {edit ? (
        <SortList empty={t.lists.empty} onMove={reorder}>
          {lists.map((l) => (
            <Row key={l.id} title={l.name} sub={l.title} style={{ '--c': 'var(--primary)' } as CSSProperties}
              check={<RemoveButton label={t.common.deleteNamed(l.name)} title={t.common.deleteAsk(l.name)} description={t.lists.deleteListText} onConfirm={() => dispatch({ type: 'deleteList', id: l.id })} />}
              onOpen={() => listSheet.open(l)} sort />
          ))}
        </SortList>
      ) : lists.length ? (
        <div className="card-grid" style={{ '--c': 'var(--primary)' } as CSSProperties}>
          {lists.map((l) => {
            const n = doneIn(state, l)
            return (
              <LinkCard key={l.id} to="/lists/$id" params={{ id: l.id }} title={l.name}
                sub={<span className="grid gap-2"><span>{l.title}</span><Progress n={n} total={l.items.length} /></span>} />
            )
          })}
        </div>
      ) : <List empty={t.lists.empty} />}
      {listSheet.value && <ListSheet key={listSheet.value.id || 'new'} {...listSheet.props} list={listSheet.value} onSaved={(id) => { if (!listSheet.value?.id) void nav({ to: '/lists/$id', params: { id } }) }} />}
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
  const [sharing, setSharing] = useState(false)
  usePageBar({
    back: { to: '/lists', label: t.lists.title },
    add: L ? { label: t.lists.item.addTo(L.name), onClick: () => itemSheet.open({ id: uid(), title: '' }) } : undefined,
    edit: L ? () => setEdit(true) : undefined,
    actions: L ? [
      { label: t.common.share, icon: Share2, onSelect: () => setSharing(true) },
      { label: t.lists.deleteList, icon: Trash2, onSelect: () => setDeleting(true), danger: true },
    ] : [],
    done: edit ? () => setEdit(false) : undefined,
  })
  if (!L) return <List empty={t.lists.page.gone} />

  const items = state.listProgress[L.id] ?? {}
  const n = doneIn(state, L)
  const q = query.toLowerCase()

  const toggle = (item: string, on: boolean) => {
    dispatch({ type: 'listItem', list: L.id, item, progress: { ...items[item], done_at: on ? new Date().toISOString() : null } })
    if (!on) return
    const next = n + 1
    if (next % 10 === 0) {
      setTimeout(celebrate, 200)
    }
  }

  const rows = L.items.map((it, idx) => {
    const p = items[it.id] ?? {}
    const on = !!p.done_at
    if (!edit && ((filter === 'done' && !on) || (filter === 'todo' && on))) return null
    const note = p.note ?? ''
    // Search only outside edit mode: dragging needs every row in place.
    if (!edit && q && !`${it.title} ${it.sub ?? ''} ${note}`.toLowerCase().includes(q)) return null
    return (
      <Row key={it.id} done={on} style={{ '--c': 'var(--primary)' } as CSSProperties}
        title={<><span className="font-normal tabular-nums text-muted-foreground">{idx + 1}.</span> {it.title}</>}
        sub={it.sub} note={note} tagInline={!edit}
        check={edit
          ? <RemoveButton label={t.common.deleteNamed(it.title)} title={t.common.deleteAsk(it.title)} description={t.lists.item.deleteText}
              onConfirm={() => dispatch({ type: 'putList', list: { ...L, items: L.items.filter((x) => x.id !== it.id) } })} />
          : <Check on={on} label={it.title} onToggle={(v) => toggle(it.id, v)} />}
        // Tapping the row (not its tick) opens your review. In edit mode it opens the item itself.
        onOpen={edit ? () => itemSheet.open(it) : () => noteSheet.open(it)} chevron={edit} sort={edit}
        // Your review (the item's note): a bubble with + to write one, a bubble with lines once there is one.
        tag={edit ? undefined
          : <button type="button" className={`icon-btn${note ? ' on' : ''}`} aria-label={note ? t.lists.review.edit(it.title) : t.lists.review.write(it.title)} onClick={() => noteSheet.open(it)}>
              {note ? <MessageSquareText aria-hidden="true" /> : <MessageSquarePlus aria-hidden="true" />}
            </button>} />
    )
  }).filter(Boolean)

  return (
    <>
      <Header title={L.name} lead={L.title} action={edit ? { label: t.lists.page.editDetails(L.name), icon: Pencil, onClick: () => listSheet.open(L) } : undefined} />
      <div className="mb-4"><Progress n={n} total={L.items.length} /></div>
      <SearchField value={query} onChange={setQuery} placeholder={t.lists.page.search(L.name)} />
      {!edit && (
        <ChipsList label={t.lists.page.show}>
          {(['all', 'todo', 'done'] as Filter[]).map((f) => (
            <Chip key={f} pressed={filter === f} onClick={() => setFilter(f)}>{t.lists.page.filters[f]}</Chip>
          ))}
        </ChipsList>
      )}
      {edit
        ? <SortList empty={t.lists.page.emptyList} onMove={(from, to) => dispatch({ type: 'putList', list: { ...L, items: moveTo(L.items, from, to) } })}>{rows}</SortList>
        : <List empty={L.items.length ? t.lists.page.emptyFilter : t.lists.page.emptyList}>{rows}</List>}
      {sharing && <ShareSheet open onOpenChange={setSharing} kind="list" name={L.name} data={listSnapshot(L)} />}
      <ConfirmSheet open={deleting} onOpenChange={setDeleting} title={t.common.deleteAsk(L.name)}
        description={t.lists.deleteListText}
        onConfirm={() => {
          dispatch({ type: 'deleteList', id: L.id })
          void nav({ to: '/lists' })
        }} />
      {listSheet.value && <ListSheet key={listSheet.value.id} {...listSheet.props} list={listSheet.value} onSaved={() => {}} />}
      {itemSheet.value && <ItemSheet key={itemSheet.value.id} {...itemSheet.props} list={L} item={itemSheet.value} />}
      {noteSheet.value && <NoteSheet key={noteSheet.value.id} {...noteSheet.props} list={L} item={noteSheet.value} />}
    </>
  )
}
