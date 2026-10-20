import type { CSSProperties, ReactNode } from 'react'

/**
 * A labelled run of rows inside one List, so one card holds a few groups (Today's tasks, habits and topic rows)
 * without splitting into sections: a thin muted label (tinted by --c) with an optional aside on its right, then
 * the rows. id: an anchor for the first-run tour.
 */
export function ListGroup({ id, label, aside, children, style }: { id?: string; label: ReactNode; aside?: ReactNode; children: ReactNode; style?: CSSProperties }) {
  return (
    <div id={id} className="list-group" style={style}>
      <div className="list-label">{label}{aside ? <small>{aside}</small> : null}</div>
      {children}
    </div>
  )
}
