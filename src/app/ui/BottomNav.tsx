import { useEffect, useState, type CSSProperties } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { MoreHorizontal, Search } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/shared/ui/primitives/dialog'
import { List, MenuRow } from '@/shared/ui'
import { t } from '@/shared/i18n'
import { searchSheet } from '@/features/search'
import { MAIN, MORE } from './tabs'

// The More sheet, as in iOS Settings: the other views and Search, then Settings in its own group.
const views = MORE.filter((m) => m.to !== '/settings')
const settings = MORE.find((m) => m.to === '/settings')!

export function BottomNav() {
  const [more, setMore] = useState(false)
  const { pathname } = useLocation()
  const inMore = MORE.some((m) => pathname.startsWith(m.to))
  useEffect(() => setMore(false), [pathname])
  // The thumb slides under the current view, column by column, so it passes the items in between.
  const slot = inMore ? MAIN.length : MAIN.findIndex((m) => pathname.startsWith(m.to))
  return (
    <nav className="bottom-nav" aria-label={t.nav.views} style={{ '--n': MAIN.length + 1 } as CSSProperties}>
      {slot >= 0 && <span className="nav-thumb" style={{ '--i': slot } as CSSProperties} aria-hidden="true" />}
      {MAIN.map(({ to, label, icon: Icon }) => <Link key={to} to={to} className="bnav"><Icon aria-hidden="true" />{label}</Link>)}
      <button className={`bnav${inMore ? ' active' : ''}`} aria-expanded={more} onClick={() => setMore(true)}><MoreHorizontal aria-hidden="true" />{t.nav.more}</button>
      <Dialog open={more} onOpenChange={setMore}>
        <DialogContent>
          <DialogTitle>{t.nav.more}</DialogTitle>
          <DialogDescription className="sr-only">{t.nav.otherViews}</DialogDescription>
          <div className="more-menu">
            <List>
              {views.map(({ to, label, icon }) => <MenuRow key={to} to={to} icon={icon} label={label} />)}
              <MenuRow icon={Search} label={t.search.title} onClick={() => { setMore(false); searchSheet.open() }} />
            </List>
            <List><MenuRow to={settings.to} icon={settings.icon} label={settings.label} /></List>
          </div>
        </DialogContent>
      </Dialog>
    </nav>
  )
}
