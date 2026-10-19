import type { ReactNode } from 'react'
import { Link, type LinkProps } from '@tanstack/react-router'
import { ChevronRight, type LucideIcon } from 'lucide-react'

/**
 * One line of a menu inside a List, as in iOS Settings: icon, label and ›. `to` goes to a page of the app,
 * `onClick` runs an action instead (opening search).
 */
export function MenuRow({ icon: Icon, label, to, onClick }: { icon: LucideIcon; label: ReactNode; to?: LinkProps['to']; onClick?: () => void }) {
  const inner = <><Icon className="menu-row-icon" aria-hidden="true" /><span className="menu-row-label">{label}</span><ChevronRight className="row-chev" aria-hidden="true" /></>
  return to
    ? <Link to={to} className="menu-row">{inner}</Link>
    : <button type="button" className="menu-row" onClick={onClick}>{inner}</button>
}
