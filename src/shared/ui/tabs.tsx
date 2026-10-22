import { useLayoutEffect, useRef, type ReactNode } from 'react'

const CURRENT = '[aria-selected="true"], [data-status="active"]'

/**
 * iOS's segmented control: a muted track of segments with a raised thumb that slides to the current one (it's
 * measured, as segments grow with their labels). Wrapped in a bar that sticks under the app header while the page
 * scrolls. Tabs switch state (a topic's Skills, Tasks…); with links inside, SegBar switches pages (the app's
 * section tabs).
 */
export function SegBar({ label, children }: { label?: string; children: ReactNode }) {
  const track = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const el = track.current
    if (!el) return
    const place = () => {
      const cur = el.querySelector<HTMLElement>(CURRENT)
      el.dataset.thumb = cur ? (el.dataset.thumb ? 'move' : 'set') : ''
      if (!cur) return
      el.style.setProperty('--thumb-x', `${cur.offsetLeft}px`)
      el.style.setProperty('--thumb-w', `${cur.offsetWidth}px`)
      // A track wider than the screen scrolls the current segment into view.
      if (el.scrollWidth > el.clientWidth) el.scrollTo({ left: cur.offsetLeft - (el.clientWidth - cur.offsetWidth) / 2, behavior: 'smooth' })
    }
    place()
    const seen = new ResizeObserver(place)
    seen.observe(el)
    return () => seen.disconnect()
  })
  return (
    <div className="seg-bar">
      <div ref={track} className="seg-control" role="tablist" aria-label={label}>
        <span className="seg-control-thumb" aria-hidden="true" />
        {children}
      </div>
    </div>
  )
}

export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { id: T; label: string; count?: string | number }[] }) {
  return (
    <SegBar>
      {items.map((it) => (
        <button key={it.id} type="button" role="tab" aria-selected={value === it.id} className="seg-control-item"  onClick={() => onChange(it.id)}>
          {it.label}{it.count != null && <span className="count">{it.count}</span>}
        </button>
      ))}
    </SegBar>
  )
}
