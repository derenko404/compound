import { useEffect, useRef, type ReactNode } from 'react'

/**
 * The one progress ring. size lg: the one big dial on a page (the timer), md: beside a page title, sm: in a card
 * or beside a line of text. The middle shows n/total (just n without a size), or value instead (the timer's mm:ss,
 * or "" for none). A full md or sm ring shows a tick instead. sub: a word under the number inside the ring.
 * caption: a small label under the ring, saying what it counts. children: text beside the ring.
 */
export function Dial({ n, total, sub, pulse, value, size, caption, children }: {
  n: number; total: number; sub?: string; pulse?: number; value?: ReactNode; size?: 'lg' | 'md' | 'sm'; caption?: string; children?: ReactNode
}) {
  const C = 2 * Math.PI * 52
  const pct = total ? n / total : 0
  const full = n === total && total > 0
  const label = value ?? (size ? `${n}/${total}` : n)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!pulse || !el) return
    el.classList.remove('pulse')
    void el.offsetWidth
    el.classList.add('pulse')
  }, [pulse])
  let ring = (
    <div ref={ref} className={`dial${size ? ` dial-${size}` : ''}${full ? ' done' : ''}${typeof label === 'string' && label.length > 5 ? ' is-long' : ''}`}>
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle className="track" cx="60" cy="60" r="52" fill="none" strokeWidth="10" />
        <circle className="fill" cx="60" cy="60" r="52" fill="none" strokeWidth="10" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - pct)} />
      </svg>
      <div className="dial-label">
        <div>
          <div className="dial-num">{full && size !== 'lg' ? <svg className="dial-tick" viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7" /></svg> : label}</div>
          {sub && <div className="dial-sub">{sub}</div>}
        </div>
      </div>
    </div>
  )
  if (caption) ring = <div className="dial-wrap">{ring}<span className="dial-caption">{caption}</span></div>
  return children ? <div className="dial-line">{ring}<span>{children}</span></div> : ring
}
