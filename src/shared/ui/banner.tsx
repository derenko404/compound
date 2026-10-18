import type { ReactNode } from 'react'
import type { TopicId } from '@/core/domain/types'
import { cvar } from './lib/cvar'

export function Banner({ children, actions, ch }: { children: ReactNode; actions?: ReactNode; ch?: TopicId | null }) {
  return (
    <div className="banner" style={ch ? cvar(ch) : undefined}>
      <p>{children}</p>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}
