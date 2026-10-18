// The app's shared building blocks. Pages compose these instead of repeating markup;
// their look comes from the tokens and patterns in src/index.css.
import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Link, type LinkProps } from '@tanstack/react-router'
import { ChevronDown } from 'lucide-react'
import type { Chapter, ChapterId } from '@/lib/types'
import { burst } from '@/fx/fx'
import { playTick, playUntick } from '@/fx/sound'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// Rows read their colour from --c; each chapter's --c-<id> is set by <ChapterColors>.
export const cvar = (ch: ChapterId | null | undefined): CSSProperties =>
  ({ '--c': ch ? `var(--c-${ch}, var(--p-gray))` : 'var(--p-gray)' }) as CSSProperties

// Maps every chapter id to its palette colour, for light and dark themes alike.
export function ChapterColors({ chapters }: { chapters: Chapter[] }) {
  const css = chapters.filter((c) => /^[a-z0-9-]+$/.test(c.id)).map((c) => `--c-${c.id}: var(--p-${c.color});`).join(' ')
  return <style>{`:root { ${css} }`}</style>
}

// Round tick button. Plays the bounce, row pop and particle burst when turned on.
export function Check({ on, label, onToggle }: { on: boolean; label: string; onToggle: (on: boolean) => void }) {
  const ref = useRef<HTMLButtonElement>(null)
  const justOn = useRef(false)
  // The bounce class is added after React has applied the new className, or it would be wiped.
  useEffect(() => {
    const el = ref.current
    if (!on || !justOn.current || !el) return
    justOn.current = false
    el.classList.remove('bounce')
    void el.offsetWidth
    el.classList.add('bounce')
  }, [on])
  return (
    <button
      ref={ref}
      className={`check${on ? ' on' : ''}`}
      aria-pressed={on}
      aria-label={label}
      onClick={() => {
        const next = !on
        if (!next) playUntick()
        if (next && ref.current) {
          justOn.current = true
          const list = ref.current.closest('.list')
          const checks = list ? list.querySelectorAll('.check').length : 1
          const ticked = list ? list.querySelectorAll('.check.on').length + 1 : 1
          playTick(ticked / checks)
          burst(ref.current, 20)
        }
        onToggle(next)
      }}
    >
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path d="M3.5 8.5l3 3 6-7" />
      </svg>
    </button>
  )
}

export function Row({ ch, done, check, title, sub, tag, children, style }: {
  ch?: ChapterId | null
  done?: boolean
  check?: ReactNode
  title: ReactNode
  sub?: ReactNode
  tag?: ReactNode
  children?: ReactNode
  style?: CSSProperties
}) {
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
    <div ref={ref} className={`row${done ? ' is-done' : ''}`} style={{ ...(ch ? cvar(ch) : {}), ...style }}>
      {check}
      <div className="row-body">
        <div className="row-title">{title}</div>
        {sub ? <div className="row-sub">{sub}</div> : null}
        {children}
      </div>
      <div className="row-tag">{tag}</div>
    </div>
  )
}

export function Dial({ n, total, sub, pulse }: { n: number; total: number; sub: string; pulse?: number }) {
  const C = 2 * Math.PI * 52
  const pct = total ? n / total : 0
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!pulse || !el) return
    el.classList.remove('pulse')
    void el.offsetWidth
    el.classList.add('pulse')
  }, [pulse])
  return (
    <div ref={ref} className={`dial${n === total && total ? ' done' : ''}`}>
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle className="track" cx="60" cy="60" r="52" fill="none" strokeWidth="10" />
        <circle className="fill" cx="60" cy="60" r="52" fill="none" strokeWidth="10" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - pct)} />
      </svg>
      <div className="dial-label">
        <div>
          <div className="dial-num">{sub === 'done today' ? `${n}/${total}` : n}</div>
          <div className="dial-sub">{sub}</div>
        </div>
      </div>
    </div>
  )
}

export function Section({ title, aside, children, style }: { title: ReactNode; aside?: ReactNode; children: ReactNode; style?: CSSProperties }) {
  return (
    <section style={style}>
      <div className="sec-head">
        <h2>{title}</h2>
        {aside ? <small>{aside}</small> : null}
      </div>
      {children}
    </section>
  )
}

// Long text folded to a few lines, with "Show more" only when it actually overflows.
export function MoreText({ children, lines = 2 }: { children: ReactNode; lines?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [overflows, setOverflows] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const check = () => setOverflows(el.scrollHeight > el.clientHeight + 1)
    check()
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => ro.disconnect()
  }, [children])
  return (
    <div className="more-text">
      <div ref={ref} className={open ? undefined : 'clamp'} style={{ WebkitLineClamp: lines }}>{children}</div>
      {(overflows || open) && (
        <button type="button" className="more-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? 'Show less' : 'Show more'}</button>
      )}
    </div>
  )
}

export function Header({ title, lead, children }: { title: ReactNode; lead?: ReactNode; children?: ReactNode }) {
  return (
    <div className="day">
      <div>
        <h1 className="day-date">{title}</h1>
        {lead ? <div className="lead"><MoreText lines={3}>{lead}</MoreText></div> : null}
      </div>
      {children ? <div className="day-aside">{children}</div> : null}
    </div>
  )
}

// Two-tap delete: the first tap arms it for 3 seconds.
export function ConfirmButton({ label, armed, onConfirm }: { label: string; armed: string; onConfirm: () => void }) {
  const [arm, setArm] = useState(false)
  useEffect(() => {
    if (!arm) return
    const t = setTimeout(() => setArm(false), 3000)
    return () => clearTimeout(t)
  }, [arm])
  return (
    <Button variant={arm ? 'destructive' : 'outline'} size="sm" className="ml-auto" onClick={() => (arm ? onConfirm() : setArm(true))}>
      {arm ? armed : label}
    </Button>
  )
}

// Text that saves itself shortly after typing stops.
export function useDebounced<T>(fn: (v: T) => void, ms = 800) {
  const t = useRef<ReturnType<typeof setTimeout>>(undefined)
  const f = useRef(fn)
  f.current = fn
  useEffect(() => () => clearTimeout(t.current), [])
  return (v: T) => {
    clearTimeout(t.current)
    t.current = setTimeout(() => f.current(v), ms)
  }
}

export const empty = (text: string) => <div className="empty">{text}</div>

/* ---------- Surfaces ---------- */

// A card of rows (Row, Entry, ProjectCard…), with a message when there's nothing in it.
export function List({ children, empty: emptyText, ch }: { children?: ReactNode; empty?: string; ch?: ChapterId | null }) {
  const has = Array.isArray(children) ? children.some(Boolean) : !!children
  return <div className="list" style={ch ? cvar(ch) : undefined}>{has ? children : emptyText ? empty(emptyText) : null}</div>
}

export const Panel = ({ children, ch, className }: { children: ReactNode; ch?: ChapterId | null; className?: string }) => (
  <div className={`panel${className ? ` ${className}` : ''}`} style={ch ? cvar(ch) : undefined}>{children}</div>
)

// A collapsible card: title, an optional counter or controls on the right, and its body.
export function Fold({ title, meta, icon, ch, open, children }: {
  title: ReactNode; meta?: ReactNode; icon?: ReactNode; ch?: ChapterId | null; open?: boolean; children: ReactNode
}) {
  return (
    <details className="fold" open={open} style={ch ? cvar(ch) : undefined}>
      <summary>
        {icon}
        <span className="fold-title">{title}</span>
        {meta != null && <span className="fold-meta">{meta}</span>}
        <ChevronDown className="chev" aria-hidden="true" />
      </summary>
      <div className="fold-body">{children}</div>
    </details>
  )
}

// One entry in a list of notes, ideas or finds: a meta line, then the content.
export const Entry = ({ ch, meta, children }: { ch?: ChapterId | null; meta?: ReactNode; children: ReactNode }) => (
  <div className="note" style={ch ? cvar(ch) : { '--c': 'var(--primary)' } as CSSProperties}>
    {meta && <div className="note-meta">{meta}</div>}
    {children}
  </div>
)

export function Banner({ children, actions, ch }: { children: ReactNode; actions?: ReactNode; ch?: ChapterId | null }) {
  return (
    <div className="banner" style={ch ? cvar(ch) : undefined}>
      <p>{children}</p>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export const Stats = ({ items, ch }: { items: { value: ReactNode; label: ReactNode }[]; ch?: ChapterId | null }) => (
  <div className="stats" style={ch ? cvar(ch) : undefined}>
    {items.map((it, i) => <div key={i} className="stat"><b>{it.value}</b><span>{it.label}</span></div>)}
  </div>
)

// A card that links to a page: chapters, skills.
export const LinkCard = ({ ch, title, sub, ...link }: { ch?: ChapterId | null; title: ReactNode; sub?: ReactNode } & LinkProps) => (
  <Link {...link} className="link-card" style={ch ? cvar(ch) : undefined}>
    <span className="link-card-title">{ch && <Dot />}{title}</span>
    {sub && <span className="link-card-sub">{sub}</span>}
  </Link>
)

/* ---------- Chips ---------- */

// A chapter's colour dot. Without ch it uses the surrounding --c.
export const Dot = ({ ch }: { ch?: ChapterId | null }) => <span className="dot" style={ch ? cvar(ch) : undefined} aria-hidden="true" />

export const Chips = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={`chips${className ? ` ${className}` : ''}`}>{children}</div>
)

// A toggle pill for filters and pickers, with an optional count and chapter dot.
export function Chip({ pressed, onClick, count, ch, children }: {
  pressed?: boolean; onClick: () => void; count?: number | string; ch?: ChapterId | null; children: ReactNode
}) {
  return (
    <button type="button" className="chbtn" aria-pressed={pressed} onClick={onClick} style={ch ? cvar(ch) : undefined}>
      {ch && <Dot />}{children}{count != null && <span className="count">{count}</span>}
    </button>
  )
}

// Same look as Chip, but navigates.
export const ChipLink = ({ ch, pressed, children, ...link }: { ch?: ChapterId | null; pressed?: boolean; children: ReactNode } & LinkProps) => (
  <Link {...link} className="chbtn text-foreground no-underline" aria-pressed={pressed} style={ch ? cvar(ch) : undefined}>
    {ch && <Dot />}{children}
  </Link>
)

/* ---------- Inputs ---------- */

export function SearchField({ value, onChange, placeholder, label = 'Search', className }: {
  value: string; onChange: (v: string) => void; placeholder?: string; label?: string; className?: string
}) {
  const id = useId()
  return (
    <div className={`field${className ? ` ${className}` : ''}`}>
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  )
}
