import type { ReactNode } from 'react'

// One choice out of a few, as iOS's segmented control: equal segments on a muted track, the chosen one raised (as WeekdaysField).
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
