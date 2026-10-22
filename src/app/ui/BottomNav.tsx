import type { CSSProperties } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { Search } from 'lucide-react'
import { searchSheet } from '@/features/search'
import { t } from '@/shared/i18n'
import { TABS, tabFor, tabTarget } from './tabs'
import { DockTimer, useTimerShown } from './DockTimer'

/**
 * Phones: iOS 26's floating tab bar, the views as icons in a glass capsule, and Search as a round button beside it;
 * while a focus session is under way that button is the timer instead.
 */
export function BottomNav() {
  const { pathname } = useLocation()
  // The thumb slides under the current view, column by column, so it passes the items in between.
  const slot = tabFor(pathname)
  const timer = useTimerShown()
  return (
    <div className="bottom-dock">
      <div className="dock-row">
        <nav className="bottom-nav" aria-label={t.nav.views} style={{ '--n': TABS.length } as CSSProperties}>
          {slot >= 0 && <span className="nav-thumb" style={{ '--i': slot } as CSSProperties} aria-hidden="true" />}
          {TABS.map((tab, i) => (
            <Link key={tab.to} to={tabTarget(tab)} className={`bnav${i === slot ? ' active' : ''}`} data-tab={tab.to} aria-label={tab.label}>
              <tab.icon aria-hidden="true" />
            </Link>
          ))}
        </nav>
        {timer ? <DockTimer /> : <button type="button" className="dock-search" aria-label={t.search.open} onClick={searchSheet.open}><Search aria-hidden="true" /></button>}
      </div>
    </div>
  )
}
