import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { CH } from '@/data/plan'
import type { ChapterId } from '@/lib/types'
import { burst } from '@/fx/fx'
import { playTick, playUntick } from '@/fx/sound'
import { Button } from '@/components/ui/button'

export const cvar = (ch: ChapterId | string): CSSProperties =>
  ({ '--c': `var(${CH[ch as ChapterId]?.color ?? '--c-own'})` }) as CSSProperties

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
  ch?: ChapterId | string
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

export function Header({ title, lead, children }: { title: ReactNode; lead?: ReactNode; children?: ReactNode }) {
  return (
    <div className="day">
      <div>
        <h1 className="day-date">{title}</h1>
        {lead ? <p className="lead">{lead}</p> : null}
      </div>
      {children}
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
