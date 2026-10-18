import { Link, type LinkProps } from '@tanstack/react-router'
import type { TopicId } from '@core/domain/types'
import { cvar } from './lib/cvar'

/**
 * A link to another page of the app inside text: project codes, topic names. Coloured by `ch`, dashed underline.
 * Links that leave the app use an external-link icon instead.
 */
export const InnerLink = ({ ch, ...link }: { ch?: TopicId | null } & LinkProps) => (
  <Link {...link} className="inner-link" style={ch ? cvar(ch) : undefined} />
)
