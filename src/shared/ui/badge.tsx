import type { ComponentType, CSSProperties, ReactNode } from 'react'
import { Link, type LinkProps } from '@tanstack/react-router'
import type { TopicId } from '@core/domain/types'
import { cvar } from './lib/cvar'
import { Dot } from './dot'

/**
 * A static pill for facts: "Day 1 of 548", "Q1", a topic. With `to` it links somewhere.
 * tint: tinted with the topic colour (`ch`, or the surrounding --c) instead of a dot.
 * color: a colour token to tint with instead of a topic's, e.g. "--slot-focus".
 */
export function Badge({ ch, tint, color, children, ...link }: { ch?: TopicId | null; tint?: boolean; color?: string; children: ReactNode } & Partial<LinkProps>) {
  const inner = <>{ch && !tint && !color && <Dot />}{children}</>
  const cls = `chip${color || tint ? ' tint' : ''}`
  const style = color ? ({ '--c': `var(${color})` } as CSSProperties) : ch ? cvar(ch) : undefined
  return link.to
    ? <Link {...(link as LinkProps)} className={`${cls} text-foreground no-underline`} style={style}>{inner}</Link>
    : <span className={cls} style={style}>{inner}</span>
}

// A round tinted badge holding only an icon; the label is its tooltip and accessible name. color: a colour token.
export const IconBadge = ({ icon: Icon, label, color }: { icon: ComponentType<{ 'aria-hidden'?: boolean }>; label: string; color: string }) => (
  <span className="chip tint icon-badge" role="img" aria-label={label} title={label} style={{ '--c': `var(${color})` } as CSSProperties}>
    <Icon aria-hidden />
  </span>
)
