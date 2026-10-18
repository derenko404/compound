// The app's shared building blocks. Pages compose these instead of repeating markup;
// their look comes from the tokens and patterns in src/index.css.
import { useEffect, useRef, useState, type ComponentType, type CSSProperties, type ReactNode } from 'react'
import { Link, type LinkProps } from '@tanstack/react-router'
import { ChevronDown, Search, X } from 'lucide-react'
import type { Chapter, ChapterId } from '@/lib/types'
import { burst } from '@/fx/fx'
import { playTick, playUntick } from '@/fx/sound'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

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

// note: the user's own text under the sub line (a list item's note). tagInline: on phones the tag stays on the
// title line instead of moving under it, for a small single control like a note button in a long list.
export function Row({ ch, done, check, title, sub, note, tag, tagInline, children, style }: {
  ch?: ChapterId | null
  done?: boolean
  check?: ReactNode
  title: ReactNode
  sub?: ReactNode
  note?: ReactNode
  tag?: ReactNode
  tagInline?: boolean
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
    <div ref={ref} className={`row${done ? ' is-done' : ''}${check ? '' : ' no-check'}${tagInline ? ' tag-inline' : ''}`} style={{ ...(ch ? cvar(ch) : {}), ...style }}>
      {check}
      <div className="row-body">
        <div className="row-title">{title}</div>
        {sub ? <div className="row-sub">{sub}</div> : null}
        {note ? <div className="row-note">{note}</div> : null}
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
        <LinkButton aria-expanded={open} onClick={() => setOpen(!open)}>{open ? 'Show less' : 'Show more'}</LinkButton>
      )}
    </div>
  )
}

// action: the whole title becomes a button with a small icon after it, e.g. opening the details form in edit mode
// (pencil) or an About sheet (info). Same on every page that has one.
export function Header({ title, lead, action, children }: {
  title: ReactNode; lead?: ReactNode; children?: ReactNode
  action?: { label: string; icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>; onClick: () => void }
}) {
  return (
    <div className="day">
      <div>
        <h1 className="day-date">
          {action
            ? <button type="button" className="title-btn" onClick={action.onClick} aria-label={action.label}>{title}<action.icon className="title-info" aria-hidden /></button>
            : title}
        </h1>
        {lead ? <div className="lead"><MoreText lines={3}>{lead}</MoreText></div> : null}
      </div>
      {children ? <div className="day-aside">{children}</div> : null}
    </div>
  )
}

// Two-tap delete: the first tap arms it for 3 seconds.
export function ConfirmButton({ label, armed, onConfirm, className = 'ml-auto' }: { label: string; armed: string; onConfirm: () => void; className?: string }) {
  const [arm, setArm] = useState(false)
  useEffect(() => {
    if (!arm) return
    const t = setTimeout(() => setArm(false), 3000)
    return () => clearTimeout(t)
  }, [arm])
  return (
    <Button variant={arm ? 'destructive' : 'outline'} className={className} onClick={() => (arm ? onConfirm() : setArm(true))}>
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

// A value that follows `v` once it stops changing for `ms`: search boxes query after typing pauses.
export function useDebouncedValue<T>(v: T, ms = 300) {
  const [out, setOut] = useState(v)
  useEffect(() => {
    const t = setTimeout(() => setOut(v), ms)
    return () => clearTimeout(t)
  }, [v, ms])
  return out
}

export const empty = (text: string) => <div className="empty">{text}</div>

// A quiet text button for secondary actions: "Show more", "Edit routines".
export const LinkButton = ({ children, onClick, ...rest }: { children: ReactNode; onClick: () => void } & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'className'>) => (
  <button type="button" className="link-btn" onClick={onClick} {...rest}>{children}</button>
)

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

// A link to another page of the app inside text: project codes, track names. Coloured by `ch`, dashed underline.
// Links that leave the app use an external-link icon instead.
export const InnerLink = ({ ch, ...link }: { ch?: ChapterId | null } & LinkProps) => (
  <Link {...link} className="inner-link" style={ch ? cvar(ch) : undefined} />
)

// A card that links to a page: chapters, skills.
export const LinkCard = ({ ch, title, sub, ...link }: { ch?: ChapterId | null; title: ReactNode; sub?: ReactNode } & LinkProps) => (
  <Link {...link} className="link-card" style={ch ? cvar(ch) : undefined}>
    <span className="link-card-title">{ch && <Dot />}{title}</span>
    {sub && <span className="link-card-sub">{sub}</span>}
  </Link>
)

// A row of tabs that sticks under the app header while the page scrolls; scrolls sideways on phones.
export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { id: T; label: string; count?: string | number }[] }) {
  return (
    <div className="seg-tabs" role="tablist">
      {items.map((it) => (
        <button key={it.id} type="button" role="tab" aria-selected={value === it.id} className="seg-tab" onClick={() => onChange(it.id)}>
          {it.label}{it.count != null && <span className="count">{it.count}</span>}
        </button>
      ))}
    </div>
  )
}

/* ---------- Chips ---------- */

// A chapter's colour dot. Without ch it uses the surrounding --c.
export const Dot = ({ ch }: { ch?: ChapterId | null }) => <span className="dot" style={ch ? cvar(ch) : undefined} aria-hidden="true" />

// A row of chips. `scroll` keeps them on one line that scrolls sideways (filters); otherwise they wrap.
// Chips that wrap onto more lines: tags, quick values, pickers inside cards and forms.
export const Chips = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={`chips${className ? ` ${className}` : ''}`}>{children}</div>
)

// A filter bar above a list: every option visible, wrapping onto more lines as needed.
export const ChipsList = ({ children, label }: { children: ReactNode; label?: string }) => (
  <div className="chips chips-list" role="group" aria-label={label}>{children}</div>
)

// A toggle pill for filters and pickers, with an optional count and chapter dot.
// icon + tone: an icon in its own colour (a colour token like "--habit-gym") before the label. Use it wherever a
// choice has its own icon and colour (tracker types, habit filters…), so they look the same everywhere.
export function Chip({ pressed, onClick, count, ch, icon: Icon, tone, children }: {
  pressed?: boolean; onClick: () => void; count?: number | string; ch?: ChapterId | null
  icon?: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>; tone?: string; children: ReactNode
}) {
  const style = tone ? ({ '--c': `var(${tone})` } as CSSProperties) : ch ? cvar(ch) : undefined
  return (
    <button type="button" className={`chbtn${tone ? ' toned' : ''}`} aria-pressed={pressed} onClick={onClick} style={style}>
      {ch && !Icon && <Dot />}{Icon && <Icon className="chip-icon" aria-hidden />}{children}{count != null && <span className="count">{count}</span>}
    </button>
  )
}

// Same look as Chip, but navigates.
export const ChipLink = ({ ch, pressed, children, ...link }: { ch?: ChapterId | null; pressed?: boolean; children: ReactNode } & LinkProps) => (
  <Link {...link} className="chbtn text-foreground no-underline" aria-pressed={pressed} style={ch ? cvar(ch) : undefined}>
    {ch && <Dot />}{children}
  </Link>
)

// A static pill for facts: "Day 1 of 548", "Q1", a chapter. With `to` it links somewhere.
// tint: tinted with the chapter colour (`ch`, or the surrounding --c) instead of a dot.
// color: a colour token to tint with instead of a chapter's, e.g. "--slot-focus".
export function Badge({ ch, tint, color, children, ...link }: { ch?: ChapterId | null; tint?: boolean; color?: string; children: ReactNode } & Partial<LinkProps>) {
  const inner = <>{ch && !tint && !color && <Dot />}{children}</>
  const cls = `chip${color || tint ? ' tint' : ''}`
  const style = color ? ({ '--c': `var(${color})` } as CSSProperties) : ch ? cvar(ch) : undefined
  return link.to
    ? <Link {...(link as LinkProps)} className={`${cls} text-foreground no-underline`} style={style}>{inner}</Link>
    : <span className={cls} style={style}>{inner}</span>
}

// A round tinted badge holding only an icon; the label is its tooltip and accessible name. color: a colour token.
export const IconBadge = ({ icon: Icon, label, color }: { icon: ComponentType<{ 'aria-hidden'?: boolean }>; label: string; color: string }) => (
  <span className="chip tint icon-badge" role="img" aria-label={label} title={label} style={{ '--c': `var(${color})` } as CSSProperties}>
    <Icon aria-hidden />
  </span>
)

// One setting in a Panel: title and explanation on the left, its control on the right. Rows are divided by lines.
export const SettingRow = ({ title, sub, children }: { title: ReactNode; sub?: ReactNode; children?: ReactNode }) => (
  <div className="setting-row">
    <div className="min-w-0"><div className="font-bold">{title}</div>{sub && <div className="text-small text-muted-foreground">{sub}</div>}</div>
    {children}
  </div>
)

// One choice out of a few, as a single bar split into equal segments (the theme, a view). Same look as WeekdaysField.
export function Segmented<T extends string>({ value, onChange, options, label }: {
  value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[]; label: string
}) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label} style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} className="segment" onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  )
}

// A slim progress bar.
export const Meter = ({ value, label }: { value: number; label: string }) => (
  <div className="meter" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value * 100)}>
    <i style={{ width: `${Math.min(1, Math.max(0, value)) * 100}%` }} />
  </div>
)

// A Meter with its count beside it: "12 of 100 done".
export const Progress = ({ n, total, label = 'done' }: { n: number; total: number; label?: string }) => (
  <div className="progress-line">
    <Meter value={total ? n / total : 0} label={`${n} of ${total} ${label}`} />
    <span><b>{n}</b> of {total} {label}</span>
  </div>
)

// A few labelled facts in a row: a small label over each value.
export const Facts = ({ items }: { items: { label: string; value: ReactNode }[] }) => (
  <dl className="facts">
    {items.map((it) => <div key={it.label}><dt>{it.label}</dt><dd>{it.value}</dd></div>)}
  </dl>
)

// Items already done when the page opened sit at the bottom. Ticking during the visit moves nothing,
// so a row never jumps away from under the finger; the next visit shows the new order.
export function useDoneLastOnOpen<T>(items: T[], isDone: (t: T) => boolean, key: (t: T) => string) {
  const [sunk] = useState(() => new Set(items.filter(isDone).map(key)))
  return [...items].sort((a, b) => Number(sunk.has(key(a))) - Number(sunk.has(key(b))))
}

/* ---------- Inputs ---------- */

// A compact search box: icon inside, no visible label (screen readers still get one), clear button once typed.
export function SearchField({ value, onChange, placeholder = 'Search', label = 'Search', className }: {
  value: string; onChange: (v: string) => void; placeholder?: string; label?: string; className?: string
}) {
  return (
    <div className={`search${className ? ` ${className}` : ''}`}>
      <Search className="search-icon" aria-hidden="true" />
      <Input type="search" aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      {value && <button type="button" className="icon-btn search-clear" aria-label="Clear search" onClick={() => onChange('')}><X /></button>}
    </div>
  )
}
