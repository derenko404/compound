import type { CSSProperties, ReactNode } from 'react'

// id: an anchor for links and the first-run tour.
export function Section({ id, title, aside, children, style }: { id?: string; title: ReactNode; aside?: ReactNode; children: ReactNode; style?: CSSProperties }) {
  return (
    <section id={id} style={style}>
      <div className="sec-head">
        <h2>{title}</h2>
        {aside ? <small>{aside}</small> : null}
      </div>
      {children}
    </section>
  )
}
