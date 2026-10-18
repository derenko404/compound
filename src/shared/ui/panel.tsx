import type { ReactNode } from 'react'
import type { TopicId } from '@/core/domain/types'
import { cvar } from './lib/cvar'

export const Panel = ({ children, ch, className }: { children: ReactNode; ch?: TopicId | null; className?: string }) => (
  <div className={`panel${className ? ` ${className}` : ''}`} style={ch ? cvar(ch) : undefined}>{children}</div>
)
