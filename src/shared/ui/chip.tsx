import type { ComponentType, CSSProperties, ReactNode } from 'react'
import { Link, type LinkProps } from '@tanstack/react-router'
import type { TopicId } from '@/core/domain/types'
import { cvar } from './lib/cvar'
import { Dot } from './dot'

/**
 * A row of chips. `scroll` keeps them on one line that scrolls sideways (filters); otherwise they wrap.
 * Chips that wrap onto more lines: tags, quick values, pickers inside cards and forms.
 */
export const Chips = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={`chips${className ? ` ${className}` : ''}`}>{children}</div>
)

// A filter bar above a list: every option visible, wrapping onto more lines as needed.
export const ChipsList = ({ children, label }: { children: ReactNode; label?: string }) => (
  <div className="chips chips-list" role="group" aria-label={label}>{children}</div>
)

/**
 * A toggle pill for filters and pickers, with an optional count and topic dot.
 * icon + tone: an icon in its own colour (a colour token like "--habit-gym") before the label. Use it wherever a
 * choice has its own icon and colour (tracker types, habit filters…), so they look the same everywhere.
 */
export function Chip({ pressed, onClick, count, ch, icon: Icon, tone, children }: {
  pressed?: boolean; onClick: () => void; count?: number | string; ch?: TopicId | null
  icon?: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>; tone?: string; children: ReactNode
}) {
  const style = tone ? ({ '--c': `var(${tone})` } as CSSProperties) : ch ? cvar(ch) : undefined
  return (
    <button type="button" className={`chbtn${tone ? ' toned' : ''}`} aria-pressed={pressed} onClick={onClick} style={style}>
      {ch && !Icon && <Dot />}{Icon && <Icon className="chip-icon" aria-hidden />}{children}{count != null && <span className="count">{count}</span>}
    </button>
  )
}

// Same look as Chip, but navigates.
export const ChipLink = ({ ch, pressed, children, ...link }: { ch?: TopicId | null; pressed?: boolean; children: ReactNode } & LinkProps) => (
  <Link {...link} className="chbtn text-foreground no-underline" aria-pressed={pressed} style={ch ? cvar(ch) : undefined}>
    {ch && <Dot />}{children}
  </Link>
)
