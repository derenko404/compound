import type { CSSProperties, ReactNode } from 'react'
import { clx } from '@/shared/lib/clx'

// How a day went: full (a filled ring), part (a ring filled to pct), empty (a bare ring), or future (a small dot).
export type WeekDayState = 'full' | 'part' | 'empty' | 'future'

export interface WeekDay { key: string; label: string; state: WeekDayState; pct?: number; today?: boolean; aria: string; value?: ReactNode }

// A week as a strip of days, Monday to Sunday: each day's name, a ring and a small value under it, today on a muted tile.
export function WeekStrip({ days }: { days: WeekDay[] }) {
  return (
    <div className="week-strip">
      {days.map((d) => (
        <div key={d.key} className={clx('wday', d.today && 'today')} data-state={d.state}>
          <span>{d.label}</span>
          <i style={{ '--pct': `${(d.pct ?? 0) * 100}%` } as CSSProperties} aria-label={d.aria} />
          <small aria-hidden="true">{d.value}</small>
        </div>
      ))}
    </div>
  )
}
