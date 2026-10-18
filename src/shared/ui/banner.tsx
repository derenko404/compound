import type { ReactNode } from 'react'
import type { TopicId } from '@core/domain/types'
import { cvar } from './lib/cvar'

// title: a bold first line. The text under it is then muted.
export function Banner({ title, children, actions, ch }: { title?: ReactNode; children: ReactNode; actions?: ReactNode; ch?: TopicId | null }) {
  return (
    <div className="banner" style={ch ? cvar(ch) : undefined}>
      <p>{title ? <><b className="banner-title">{title}</b><span className="muted">{children}</span></> : children}</p>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}
