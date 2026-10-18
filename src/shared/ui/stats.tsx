import type { ReactNode } from 'react'
import type { TopicId } from '@/core/domain/types'
import { cvar } from './lib/cvar'

export const Stats = ({ items, ch }: { items: { value: ReactNode; label: ReactNode }[]; ch?: TopicId | null }) => (
  <div className="stats" style={ch ? cvar(ch) : undefined}>
    {items.map((it, i) => <div key={i} className="stat"><b>{it.value}</b><span>{it.label}</span></div>)}
  </div>
)
