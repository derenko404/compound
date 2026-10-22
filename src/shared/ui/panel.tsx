import type { ReactNode } from 'react'
import type { TopicId } from '@core/domain/types'
import { cvar } from './lib/cvar'
import { clx } from '@/shared/lib/clx'

export const Panel = ({ children, ch, className }: { children: ReactNode; ch?: TopicId | null; className?: string }) => (
  <div className={clx('panel', className)} style={ch ? cvar(ch) : undefined}>{children}</div>
)
