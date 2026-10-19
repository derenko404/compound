import type { ReactNode } from 'react'

/**
 * A line that starts with what something is, in bold colour, then its text: "Next step · Word stress".
 * color: a colour token (--slot-focus); without it the surrounding --c (a topic's colour).
 */
export const Kind = ({ label, color, children }: { label: ReactNode; color?: string; children?: ReactNode }) => (
  <>
    <span className="kind" style={color ? { color: `var(${color})` } : undefined}>{label}</span>
    {children ? <> · {children}</> : null}
  </>
)
