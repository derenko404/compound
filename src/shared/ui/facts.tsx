import type { ReactNode } from 'react'

// A few labelled facts in a row: a small label over each value.
export const Facts = ({ items }: { items: { label: string; value: ReactNode }[] }) => (
  <dl className="facts">
    {items.map((it) => <div key={it.label}><dt>{it.label}</dt><dd>{it.value}</dd></div>)}
  </dl>
)
