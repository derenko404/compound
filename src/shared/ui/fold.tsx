import { useEffect, useRef, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import type { TopicId } from '@core/domain/types'
import { celebrate } from '@/shared/lib/celebrate'
import { cvar } from './lib/cvar'

/**
 * A collapsible card: title, an optional counter or controls on the right, and its body.
 * done: everything inside is ticked. The card is tinted with a filled tick in place of its counter, and turning
 * done throws confetti.
 */
export function Fold({ title, meta, icon, ch, open, done, children }: {
  title: ReactNode; meta?: ReactNode; icon?: ReactNode; ch?: TopicId | null; open?: boolean; done?: boolean; children: ReactNode
}) {
  const was = useRef(done)
  useEffect(() => {
    if (done && !was.current) setTimeout(celebrate, 250)
    was.current = done
  }, [done])
  return (
    <details className={`fold${done ? ' is-done' : ''}`} open={open} style={ch ? cvar(ch) : undefined}>
      <summary>
        {icon}
        <span className="fold-title">{title}</span>
        {meta != null && !done && <span className="fold-meta">{meta}</span>}
        {done && <span className="fold-done" aria-hidden="true"><svg viewBox="0 0 16 16"><path d="M3.5 8.5l3 3 6-7" /></svg></span>}
        <ChevronDown className="chev" aria-hidden="true" />
      </summary>
      <div className="fold-body">{children}</div>
    </details>
  )
}
