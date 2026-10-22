import type { CSSProperties, ReactNode } from 'react'
import { clx } from '@/shared/lib/clx'

/**
 * One choice out of a few, as iOS's segmented control: equal segments on a muted track, the chosen one raised (as WeekdaysField).
 * An option's color (a colour token) tints it once chosen: a project's status in grey, amber or green.
 */
export function Segmented<T extends string>({ value, onChange, options, label }: {
  value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode; color?: string }[]; label: string
}) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label} style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} className={clx('segment', o.color && 'is-toned')}
          style={o.color ? { '--c': `var(${o.color})` } as CSSProperties : undefined} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  )
}
