import type { ComponentType, ReactNode } from 'react'
import { MoreText } from './more-text'

/**
 * action: the whole title becomes a button with a small icon after it, e.g. opening the details form in edit mode
 * (pencil) or an About sheet (info). Same on every page that has one.
 */
export function Header({ title, lead, action, children }: {
  title: ReactNode; lead?: ReactNode; children?: ReactNode
  action?: { label: string; icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>; onClick: () => void }
}) {
  return (
    <div className="day">
      <div>
        <h1 className="day-date">
          {action
            ? <button type="button" className="title-btn" onClick={action.onClick} aria-label={action.label}>{title}<action.icon className="title-info" aria-hidden /></button>
            : title}
        </h1>
        {lead ? <div className="lead"><MoreText lines={3}>{lead}</MoreText></div> : null}
      </div>
      {children ? <div className="day-aside">{children}</div> : null}
    </div>
  )
}
