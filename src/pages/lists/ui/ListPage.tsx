import { useEffect, useState, type CSSProperties } from 'react'
import { getRouteApi, useLocation, useNavigate } from '@tanstack/react-router'
import { MessageSquarePlus, MessageSquareText, Share2, Trash2 } from 'lucide-react'
import { usePageBar, Check, Chip, ChipsList, Header, List, Dial, Row, SortList, SearchField, ConfirmSheet, RemoveButton, moveTo, useSheet } from '@/shared/ui'
import { listSnapshot, uid } from '@core/domain/content'
import { ShareSheet } from '@/features/share-link'
import type { ListDef, ListDefItem } from '@core/domain/types'
import { useStore } from '@/shared/store/StoreProvider'
import { celebrate } from '@/shared/lib/celebrate'
import { t } from '@/shared/i18n'
import { ListSheet } from './ListSheet'
import { ItemSheet } from './ItemSheet'
import { ReviewSheet } from './ReviewSheet'
import { doneIn } from './done-in'

type Filter = 'all' | 'todo' | 'done'

const route = getRouteApi('/lists/$id')

export function ListPage() {
  const { id } = route.useParams()
  const { state, dispatch } = useStore()
  const nav = useNavigate()
  const L = state.lists.find((l) => l.id === id)
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const { hash } = useLocation()
  // Arriving from search (#item-<id>) scrolls to the item and flashes it.
  useEffect(() => {
    const el = hash.startsWith('item-') ? document.getElementById(hash) : null
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el.classList.remove('flash')
    void el.offsetWidth
    el.classList.add('flash')
  }, [hash])
  const [edit, setEdit] = useState(false)
  const listSheet = useSheet<ListDef>()
  const itemSheet = useSheet<ListDefItem>()
  const reviewSheet = useSheet<ListDefItem>()
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
      <Row key={it.id} id={`item-${it.id}`} done={on} style={{ '--c': 'var(--primary)' } as CSSProperties}
        title={<><span className="font-normal tabular-nums text-muted-foreground">{idx + 1}.</span> {it.title}</>}
        sub={it.sub} note={note} tagInline={!edit}
        check={edit
          ? <RemoveButton label={t.common.deleteNamed(it.title)} title={t.common.deleteAsk(it.title)} description={t.lists.item.deleteText}
              onConfirm={() => dispatch({ type: 'putList', list: { ...L, items: L.items.filter((x) => x.id !== it.id) } })} />
          : <Check on={on} label={it.title} onToggle={(v) => toggle(it.id, v)} />}
        // Tapping the row (not its tick) opens your review. In edit mode it opens the item itself.
        onOpen={edit ? () => itemSheet.open(it) : () => reviewSheet.open(it)} chevron={edit} sort={edit}
        // Your review (the item's note): a bubble with + to write one, a bubble with lines once there is one.
        tag={edit ? undefined
          : <button type="button" className={`icon-btn${note ? ' on' : ''}`} aria-label={note ? t.lists.review.edit(it.title) : t.lists.review.write(it.title)} onClick={() => reviewSheet.open(it)}>
              {note ? <MessageSquareText aria-hidden="true" /> : <MessageSquarePlus aria-hidden="true" />}
            </button>} />
    )
  }).filter(Boolean)

  return (
    <>
      <Header title={L.name} lead={L.title} action={edit ? { label: t.lists.page.editDetails(L.name), onClick: () => listSheet.open(L) } : undefined} />
      <div className="mb-4"><Dial size="sm" n={n} total={L.items.length} /></div>
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
      {reviewSheet.value && <ReviewSheet key={reviewSheet.value.id} {...reviewSheet.props} list={L} item={reviewSheet.value} />}
    </>
  )
}
