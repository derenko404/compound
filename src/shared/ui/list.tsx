import type { ReactNode } from 'react'
import type { TopicId } from '@core/domain/types'
import { cvar } from './lib/cvar'
import { empty } from './lib/empty'
import { clx } from '@/shared/lib/clx'

// A card of rows (Row, Entry, ProjectCard…), with a message when there's nothing in it. dense: lighter one-line rows (My day).
export function List({ children, empty: emptyText, ch, dense }: { children?: ReactNode; empty?: string; ch?: TopicId | null; dense?: boolean }) {
  const has = Array.isArray(children) ? children.some(Boolean) : !!children
  return <div className={clx('list', dense && 'dense')} style={ch ? cvar(ch) : undefined}>{has ? children : emptyText ? empty(emptyText) : null}</div>
}
