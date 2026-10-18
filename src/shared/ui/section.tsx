import type { CSSProperties, ReactNode } from 'react'

export function Section({ title, aside, children, style }: { title: ReactNode; aside?: ReactNode; children: ReactNode; style?: CSSProperties }) {
  return (
    <section style={style}>
      <div className="sec-head">
        <h2>{title}</h2>
        {aside ? <small>{aside}</small> : null}
      </div>
      {children}
    </section>
  )
}
