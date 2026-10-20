import type { CSSProperties, ReactNode } from 'react'

/**
 * id: an anchor for links and the first-run tour. group: one group of a page's list (Today's tasks, habits, the
 * topics' rows), with a small muted label and groups close together, instead of a page section with a heading.
 */
export function Section({ id, title, aside, children, style, group }: {
  id?: string; title: ReactNode; aside?: ReactNode; children: ReactNode; style?: CSSProperties; group?: boolean
}) {
  return (
    <section id={id} style={style} className={group ? 'sec-group' : undefined}>
      <div className="sec-head">
        <h2>{title}</h2>
        {aside ? <small>{aside}</small> : null}
      </div>
      {children}
    </section>
  )
}
