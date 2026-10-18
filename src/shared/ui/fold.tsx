import type { ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import type { TopicId } from '@/core/domain/types'
import { cvar } from './lib/cvar'

// A collapsible card: title, an optional counter or controls on the right, and its body.
export function Fold({ title, meta, icon, ch, open, children }: {
  title: ReactNode; meta?: ReactNode; icon?: ReactNode; ch?: TopicId | null; open?: boolean; children: ReactNode
}) {
  return (
    <details className="fold" open={open} style={ch ? cvar(ch) : undefined}>
      <summary>
        {icon}
        <span className="fold-title">{title}</span>
        {meta != null && <span className="fold-meta">{meta}</span>}
        <ChevronDown className="chev" aria-hidden="true" />
      </summary>
      <div className="fold-body">{children}</div>
    </details>
  )
}
