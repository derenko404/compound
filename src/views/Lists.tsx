import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LIST_META } from '@/data/plan'
import { LISTS } from '@/data/lists'
import type { ListKey } from '@/lib/types'
import { useStore } from '@/store/StoreProvider'
import { celebrate, praise, toast } from '@/fx/fx'
import { Check, Dial, Header, Row, empty, useDebounced } from '@/components/kit'

const KEYS = Object.keys(LIST_META) as ListKey[]
type Filter = 'all' | 'todo' | 'done'

export function Lists() {
  const { state, dispatch } = useStore()
  const [sel, setSel] = useState<ListKey>('books')
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [openNotes, setOpenNotes] = useState<Set<string>>(new Set())
  const L = LISTS[sel]
  const meta = LIST_META[sel]
  const items = state.lists[sel]
  const doneCount = (k: ListKey) => Object.values(state.lists[k]).filter((i) => i.done_at).length
  const n = doneCount(sel)
  const q = query.toLowerCase()
  const saveNote = useDebounced(({ list, idx, note }: { list: ListKey; idx: number; note: string }) => {
    dispatch({ type: 'listItem', list, idx, item: { ...state.lists[list][idx], note: note.trim() ? note : null } })
  })

  const toggle = (idx: number, on: boolean) => {
    dispatch({ type: 'listItem', list: sel, idx, item: { ...items[idx], done_at: on ? new Date().toISOString() : null } })
    if (!on) return
    const next = n + 1
    if (next % 10 === 0) {
      setTimeout(celebrate, 200)
      toast(`${next} of 100 ${meta.name.toLowerCase()}. Milestone.`)
    } else toast(praise())
  }

  const rows = L.map(([title, sub], idx) => {
    const it = items[idx] ?? {}
    const on = !!it.done_at
    if ((filter === 'done' && !on) || (filter === 'todo' && on)) return null
    const note = it.note ?? ''
    if (q && !`${title} ${sub} ${note}`.toLowerCase().includes(q)) return null
    const showNote = !!note || openNotes.has(sel + idx)
    return (
      <Row key={sel + idx} done={on} style={{ '--c': 'var(--primary)' } as React.CSSProperties}
        title={<><span className="font-normal tabular-nums text-muted-foreground">{idx + 1}.</span> {title}</>}
        sub={sub}
        check={<Check on={on} label={title} onToggle={(v) => toggle(idx, v)} />}
        tag={showNote ? null : <Button variant="outline" size="sm" onClick={() => setOpenNotes(new Set(openNotes).add(sel + idx))}>Note</Button>}>
        {showNote && (
          <Input className="mt-2 h-8 bg-background" autoFocus={!note} defaultValue={note} aria-label={`Note for ${title}`}
            placeholder="Your note: thoughts, rating, when and where" onChange={(e) => saveNote({ list: sel, idx, note: e.target.value })} />
        )}
      </Row>
    )
  }).filter(Boolean)

  return (
    <>
      <Header title={meta.title} lead="Tick what you've done and keep a note on each one. These lists are a starting point; add your own picks as tasks or ideas.">
        <Dial n={n} total={L.length} sub={`of ${L.length}`} />
      </Header>
      <div className="chips">
        {KEYS.map((k) => (
          <button key={k} className="chbtn" aria-pressed={sel === k} onClick={() => { setSel(k); setQuery('') }}>
            {LIST_META[k].name} <span className="font-normal text-muted-foreground">{doneCount(k)}/100</span>
          </button>
        ))}
      </div>
      <div className="actions mb-3.5 mt-0">
        <div className="field flex-[1_1_220px]">
          <Label htmlFor="list-search">Search</Label>
          <Input id="list-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Title, ${meta.sub.toLowerCase()} or note`} />
        </div>
        <div className="chips m-0 self-end">
          {(['all', 'todo', 'done'] as Filter[]).map((f) => (
            <button key={f} className="chbtn" aria-pressed={filter === f} onClick={() => setFilter(f)}>
              {{ all: 'All', todo: 'Still to do', done: 'Done' }[f]}
            </button>
          ))}
        </div>
      </div>
      <div className="list">{rows.length ? rows : empty('Nothing here with this filter.')}</div>
    </>
  )
}
