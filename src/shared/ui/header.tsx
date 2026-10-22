import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { MoreText } from './more-text'

/**
 * action: the whole title becomes a button with a muted › after it, as on iOS: it opens the About sheet, or the
 * details form in edit mode. Same on every page that has one.
 * sub: short lines under the title (Today's date, a topic's next step and focus mark). children: on the right.
 * kicker: a small caps line above the title, what the page belongs to ("EN1 · Pronunciation"), as iOS article pages.
 */
export function Header({ title, kicker, lead, sub, action, children }: {
  title: ReactNode; kicker?: ReactNode; lead?: ReactNode; sub?: ReactNode; children?: ReactNode
  action?: { label: string; onClick: () => void }
}) {
  return (
    <div className="day">
      <div>
        {kicker ? <div className="day-kicker">{kicker}</div> : null}
        <h1 className="day-date">
          {action
            ? <button type="button" className="title-btn" onClick={action.onClick} aria-label={action.label}>{title}<ChevronRight className="title-chev" aria-hidden /></button>
            : title}
        </h1>
        {sub ? <div className="day-sub">{sub}</div> : null}
        {lead ? <div className="lead"><MoreText lines={3}>{lead}</MoreText></div> : null}
      </div>
      {children ? <div className="day-aside">{children}</div> : null}
    </div>
  )
}
