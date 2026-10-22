import type { ReactNode } from 'react'
import { Link, type LinkProps } from '@tanstack/react-router'
import type { TopicId } from '@core/domain/types'
import { cvar } from './lib/cvar'
import { Dot } from './dot'
import { clx } from '@/shared/lib/clx'

// A card that links to a page: topics, skills, lists. `aside` sits on the right, centred on the card (a list's ring).
export const LinkCard = ({ ch, title, sub, aside, ...link }: { ch?: TopicId | null; title: ReactNode; sub?: ReactNode; aside?: ReactNode } & LinkProps) => (
  <Link {...link} className={clx('link-card', aside && 'has-aside')} style={ch ? cvar(ch) : undefined}>
    <span className="link-card-title">{ch && <Dot />}{title}</span>
    {sub && <span className="link-card-sub">{sub}</span>}
    {aside && <span className="link-card-aside">{aside}</span>}
  </Link>
)
