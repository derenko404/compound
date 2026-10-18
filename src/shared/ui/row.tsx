import { createContext, useContext, useEffect, useRef, type CSSProperties, type KeyboardEvent, type MouseEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { ChevronRight, Menu } from 'lucide-react'
import type { TopicId } from '@core/domain/types'
import { t } from '@/shared/i18n'
import { cvar } from './lib/cvar'
import { List } from './list'

/**
 * note: the user's own text under the sub line (a list item's note). tagInline: on phones the tag stays on the
 * title line instead of moving under it, for a small single control like a note button in a long list.
 * Edit mode, as on iOS: onOpen makes the whole row open its form (with › on the right), and sort adds a ≡ handle
 * to drag it to a new place inside a SortList. Leave out check while editing: ticks are off.
 */
export function Row({ id, ch, done, check, title, sub, note, tag, tagInline, onOpen, chevron = true, sort, children, style }: {
  // An anchor for links to this row (a search result scrolls to it).
  id?: string
  ch?: TopicId | null
  done?: boolean
  check?: ReactNode
  title: ReactNode
  sub?: ReactNode
  note?: ReactNode
  tag?: ReactNode
  tagInline?: boolean
  onOpen?: () => void
  chevron?: boolean // false: the row still opens on a tap but shows no ›
  sort?: boolean
  children?: ReactNode
  style?: CSSProperties
}) {
  const reorder = useContext(SortCtx)
  const ref = useRef<HTMLDivElement>(null)
  const was = useRef(done)
  useEffect(() => {
    const el = ref.current
    if (done && !was.current && el) {
      el.classList.remove('pop')
      void el.offsetWidth
      el.classList.add('pop')
    }
    was.current = done
  }, [done])
  return (
    <div ref={ref} id={id} className={`row${done ? ' is-done' : ''}${check ? '' : ' no-check'}${tagInline ? ' tag-inline' : ''}${onOpen ? ' is-openable' : ''}`}
      style={{ ...(ch ? cvar(ch) : {}), ...style }}
      {...(onOpen && { role: 'button', tabIndex: 0, onClick: (e: MouseEvent) => { if (!(e.target as HTMLElement).closest('button, a')) onOpen() }, onKeyDown: (e: KeyboardEvent) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onOpen() } } })}>
      {check}
      <div className="row-body">
        <div className="row-title">{title}</div>
        {sub ? <div className="row-sub">{sub}</div> : null}
        {note ? <div className="row-note">{note}</div> : null}
        {children}
      </div>
      <div className="row-tag">
        {tag}
        {onOpen && chevron && <ChevronRight className="row-chev" aria-hidden="true" />}
        {sort && reorder && (
          <button type="button" className="sort-handle" aria-label={t.common.reorder}
            onClick={(e) => e.stopPropagation()} onPointerDown={(e) => dragRow(e, reorder)}
            onKeyDown={(e) => {
              if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
              e.preventDefault()
              const { rows, from } = siblings(e.currentTarget)
              const to = from + (e.key === 'ArrowUp' ? -1 : 1)
              if (to >= 0 && to < rows.length) reorder(from, to)
            }}>
            <Menu aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  )
}

/* ---------- Reordering by drag ---------- */

const SortCtx = createContext<((from: number, to: number) => void) | null>(null)

// A List whose rows (Row sort) can be dragged to a new place by their ≡ handle. onMove gets the old and new index.
export function SortList({ onMove, ...list }: { onMove: (from: number, to: number) => void; children?: ReactNode; empty?: string; ch?: TopicId | null }) {
  return <SortCtx.Provider value={onMove}><List {...list} /></SortCtx.Provider>
}

// The rows of the list a handle sits in, and which one is its own.
function siblings(handle: HTMLElement) {
  const item = handle.closest<HTMLElement>('.row')!
  const rows = [...item.parentElement!.children].filter((el): el is HTMLElement => el.classList.contains('row'))
  return { item, rows, from: rows.indexOf(item) }
}

/**
 * The row follows the pointer (kept inside its list), the rows it passes slide out of its way, and on release
 * the list is reordered. Moves are only visual until then, so a cancelled drag changes nothing.
 */
function dragRow(e: ReactPointerEvent<HTMLElement>, onMove: (from: number, to: number) => void) {
  if (e.button !== 0) return
  e.preventDefault()
  const handle = e.currentTarget
  const { item, rows, from } = siblings(handle)
  const box = item.parentElement!
  const rects = rows.map((r) => r.getBoundingClientRect())
  const size = rects[from].height
  const min = rects[0].top - rects[from].top
  const max = rects[rects.length - 1].bottom - rects[from].bottom
  const startY = e.clientY
  let to = from
  handle.setPointerCapture(e.pointerId)
  item.classList.add('is-dragging')
  box.classList.add('is-sorting')
  const follow = (ev: PointerEvent) => {
    const dy = Math.min(max, Math.max(min, ev.clientY - startY))
    item.style.transform = `translateY(${dy}px)`
    const mid = rects[from].top + size / 2 + dy
    to = from
    rects.forEach((r, i) => {
      const half = r.top + r.height / 2
      if (i > from && mid > half) to = i
      if (i < from && mid < half && to === from) to = i
    })
    rows.forEach((r, i) => {
      if (i === from) return
      const shift = from < to && i > from && i <= to ? -size : to < from && i >= to && i < from ? size : 0
      r.style.transform = shift ? `translateY(${shift}px)` : ''
    })
  }
  const end = () => {
    handle.removeEventListener('pointermove', follow)
    handle.removeEventListener('pointerup', end)
    handle.removeEventListener('pointercancel', cancel)
    rows.forEach((r) => { r.style.transform = '' })
    item.classList.remove('is-dragging')
    box.classList.remove('is-sorting')
    if (to !== from) onMove(from, to)
  }
  const cancel = () => { to = from; end() }
  handle.addEventListener('pointermove', follow)
  handle.addEventListener('pointerup', end)
  handle.addEventListener('pointercancel', cancel)
}
