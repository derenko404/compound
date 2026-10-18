import type { ReactNode } from 'react'
import type { TopicId } from '@/core/domain/types'
import { cvar } from './lib/cvar'
import { empty } from './lib/empty'

// A card of rows (Row, Entry, ProjectCard…), with a message when there's nothing in it.
export function List({ children, empty: emptyText, ch }: { children?: ReactNode; empty?: string; ch?: TopicId | null }) {
  const has = Array.isArray(children) ? children.some(Boolean) : !!children
  return <div className="list" style={ch ? cvar(ch) : undefined}>{has ? children : emptyText ? empty(emptyText) : null}</div>
}
