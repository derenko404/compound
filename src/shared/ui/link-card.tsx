import type { ReactNode } from 'react'
import { Link, type LinkProps } from '@tanstack/react-router'
import type { TopicId } from '@core/domain/types'
import { cvar } from './lib/cvar'
import { Dot } from './dot'

// A card that links to a page: topics, skills.
export const LinkCard = ({ ch, title, sub, ...link }: { ch?: TopicId | null; title: ReactNode; sub?: ReactNode } & LinkProps) => (
  <Link {...link} className="link-card" style={ch ? cvar(ch) : undefined}>
    <span className="link-card-title">{ch && <Dot />}{title}</span>
    {sub && <span className="link-card-sub">{sub}</span>}
  </Link>
)
