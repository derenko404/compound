import type { CSSProperties } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { t } from '@/shared/i18n'
import { TABS } from './tabs'

/**
 * Wider screens: every view in one row of equal tabs under the header, icon over a small label, with the same
 * sliding thumb as the phone's bottom bar (it moves column by column to the current view).
 */
export function TopTabs() {
  const { pathname } = useLocation()
  const slot = TABS.findIndex((m) => pathname.startsWith(m.to))
  return (
    <nav className="tabs" aria-label={t.nav.views} style={{ '--n': TABS.length } as CSSProperties}>
      {slot >= 0 && <span className="nav-thumb" style={{ '--i': slot } as CSSProperties} aria-hidden="true" />}
      {TABS.map(({ to, label, icon: Icon }) => <Link key={to} to={to} className="tab"><Icon aria-hidden="true" />{label}</Link>)}
    </nav>
  )
}
