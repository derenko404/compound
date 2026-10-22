import type { CSSProperties } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { t } from '@/shared/i18n'
import { TABS, tabFor, tabTarget } from './tabs'

/**
 * Wider screens: every view in one row of equal tabs under the header, icon over a small label, with the same
 * sliding thumb as the phone's bottom bar (it moves column by column to the current view).
 */
export function TopTabs() {
  const { pathname } = useLocation()
  const slot = tabFor(pathname)
  return (
    <nav className="tabs" aria-label={t.nav.views} style={{ '--n': TABS.length } as CSSProperties}>
      {slot >= 0 && <span className="nav-thumb" style={{ '--i': slot } as CSSProperties} aria-hidden="true" />}
      {TABS.map((tab, i) => (
        <Link key={tab.to} to={tabTarget(tab)} className={`tab${i === slot ? ' active' : ''}`}><tab.icon aria-hidden="true" />{tab.label}</Link>
      ))}
    </nav>
  )
}
