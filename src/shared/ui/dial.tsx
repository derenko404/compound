import { useEffect, useRef, type ReactNode } from 'react'

// value: shown in the middle instead of the count (the timer's mm:ss). size lg: the one big dial on a page.
export function Dial({ n, total, sub, pulse, value, size }: { n: number; total: number; sub: string; pulse?: number; value?: ReactNode; size?: 'lg' }) {
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
    <div ref={ref} className={`dial${size === 'lg' ? ' dial-lg' : ''}${n === total && total ? ' done' : ''}`}>
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle className="track" cx="60" cy="60" r="52" fill="none" strokeWidth="10" />
        <circle className="fill" cx="60" cy="60" r="52" fill="none" strokeWidth="10" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - pct)} />
      </svg>
      <div className="dial-label">
        <div>
          <div className="dial-num">{value ?? n}</div>
          <div className="dial-sub">{sub}</div>
        </div>
      </div>
    </div>
  )
}
