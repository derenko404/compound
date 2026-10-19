import { useState, type CSSProperties } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { usePageBar, Header, LinkCard, List, Dial, Row, SearchField, SortList, RemoveButton, empty, moveTo, useSheet } from '@/shared/ui'
import { search } from '@core/domain/search'
import { SearchResults, useOpenHit } from '@/features/search'
import { byPosition, nextPosition } from '@core/domain/content'
import type { ListDef } from '@core/domain/types'
import { useStore } from '@/shared/store/StoreProvider'
import { t } from '@/shared/i18n'
import { ListSheet } from './ListSheet'
import { doneIn } from './done-in'

const blankList = (lists: ListDef[]): ListDef => ({ id: '', position: nextPosition(lists), name: '', title: '', sub_label: '', items: [] })

export function Lists() {
  const { state, dispatch } = useStore()
  const nav = useNavigate()
  const lists = byPosition(state.lists)
  const listSheet = useSheet<ListDef>()
  const [edit, setEdit] = useState(false)
  const [query, setQuery] = useState('')
  const openHit = useOpenHit()
  // Typing searches every list and its items (and your reviews of them) instead of showing the cards.
  const hits = search.inState(state, query, ['list', 'listItem'])
  usePageBar({ add: { label: t.lists.newList, onClick: () => listSheet.open(blankList(lists)) }, edit: lists.length ? () => setEdit(true) : undefined, done: edit ? () => setEdit(false) : undefined })
  const reorder = (from: number, to: number) => {
    const ys = moveTo(lists, from, to)
    dispatch({ type: 'batch', ops: ys.flatMap((x, j) => (x.position === j ? [] : [{ type: 'putList' as const, list: { ...x, position: j } }])) })
  }
  return (
    <>
      <Header title={t.lists.title} lead={t.lists.lead} />
      {!edit && lists.length > 0 && <SearchField value={query} onChange={setQuery} placeholder={t.search.listsPlaceholder} />}
      {!edit && query.trim() ? (
        hits.length ? <SearchResults hits={hits} onPick={(h) => void openHit(h)} /> : empty(t.search.nothing)
      ) : edit ? (
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
                sub={<span className="grid gap-2"><span>{l.title}</span><Dial size="sm" n={n} total={l.items.length} /></span>} />
            )
          })}
        </div>
      ) : <List empty={t.lists.empty} />}
      {listSheet.value && <ListSheet key={listSheet.value.id || 'new'} {...listSheet.props} list={listSheet.value} onSaved={(id) => { if (!listSheet.value?.id) void nav({ to: '/lists/$id', params: { id } }) }} />}
    </>
  )
}
