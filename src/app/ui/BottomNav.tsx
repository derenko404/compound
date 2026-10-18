import { useEffect, useState } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { MoreHorizontal } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/shared/ui/primitives/dialog'
import { t } from '@/shared/i18n'
import { MAIN, MORE } from './tabs'

export function BottomNav() {
  const [more, setMore] = useState(false)
  const { pathname } = useLocation()
  const inMore = MORE.some((m) => pathname.startsWith(m.to))
  useEffect(() => setMore(false), [pathname])
  return (
    <nav className="bottom-nav" aria-label={t.nav.views}>
      {MAIN.map(({ to, label, icon: Icon }) => <Link key={to} to={to} className="bnav"><Icon aria-hidden="true" />{label}</Link>)}
      <button className={`bnav${inMore ? ' active' : ''}`} aria-expanded={more} onClick={() => setMore(true)}><MoreHorizontal aria-hidden="true" />{t.nav.more}</button>
      <Dialog open={more} onOpenChange={setMore}>
        <DialogContent>
          <DialogTitle>{t.nav.more}</DialogTitle>
          <DialogDescription className="sr-only">{t.nav.otherViews}</DialogDescription>
          <div className="more-grid">
            {MORE.map(({ to, label, icon: Icon }) => <Link key={to} to={to} className="more-item"><Icon aria-hidden="true" />{label}</Link>)}
          </div>
        </DialogContent>
      </Dialog>
    </nav>
  )
}
