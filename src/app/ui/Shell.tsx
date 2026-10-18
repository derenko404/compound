import { useEffect, useRef } from 'react'
import { Link, Outlet, useLocation, useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Toaster } from '@/shared/ui/primitives/sonner'
import { TopicColors } from '@/shared/ui'
import { mountFx } from '@/shared/lib/celebrate'
import { startReminderLoop } from '@/shared/lib/reminders'
import { dates } from '@/shared/lib/dates'
import { todayItems } from '@/features/today'
import { useStore } from '@/shared/store/StoreProvider'
import { PENDING_SHARE } from '@/features/auth'
import { SignIn } from '@/features/auth'
import { t } from '@/shared/i18n'
import { useSeed } from '@/app/seed/use-seed'
import { TopBar } from './TopBar'
import { BottomNav } from './BottomNav'
import { TABS } from './tabs'

export function Shell() {
  const { mode, sync, ready, state } = useStore()
  const { pathname } = useLocation()
  const nav = useNavigate()
  // A shared link opens without an account. Signing in from it (Google lands on /today) comes back to finish adding.
  const sharing = pathname.startsWith('/share/')
  useEffect(() => {
    if (mode === 'signin' || !ready) return
    const id = localStorage.getItem(PENDING_SHARE)
    if (!id) return
    localStorage.removeItem(PENDING_SHARE)
    if (pathname !== `/share/${id}`) void nav({ to: '/share/$id', params: { id } })
  }, [mode, ready, pathname, nav])
  const seeding = useSeed()
  const fx = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => (fx.current ? mountFx(fx.current) : undefined), [])
  useEffect(() => {
    if (!sessionStorage.getItem('roadmap-just-updated')) return
    /**
     * Shown once the shell has settled. The flag is cleared
     * inside the timer so StrictMode's mount-unmount-mount doesn't drop the toast.
     */
    const id = setTimeout(() => {
      sessionStorage.removeItem('roadmap-just-updated')
      toast.success(t.nav.appUpdated)
    }, 500)
    return () => clearTimeout(id)
  }, [])
  useEffect(
    () =>
      startReminderLoop(() => {
        const s = stateRef.current
        const done = new Set(s.days[dates.keyOf(new Date())]?.done ?? [])
        return todayItems(s, new Date()).filter((i) => !(i.done ?? done.has(i.id))).length
      }, () => dates.keyOf(new Date())),
    [],
  )

  return (
    <>
      <canvas id="fx" ref={fx} aria-hidden="true" />
      <div className="wrap">
        {mode === 'signin' ? (sharing ? <main><Outlet /></main> : <SignIn />) : (
          <>
            <TopBar sync={sync} />
            <nav className="tabs" aria-label={t.nav.views}>
              {TABS.map(({ to, label, icon: Icon }) => <Link key={to} to={to} className="tab"><Icon aria-hidden="true" />{label}</Link>)}
            </nav>
            <TopicColors topics={state.topics} />
            <main>{ready && !seeding ? <Outlet /> : <div className="empty">{t.nav.loadingProgress}</div>}</main>
            <BottomNav />
          </>
        )}
      </div>
      {/* Toasts at the top, below the iPhone's status bar / notch. */}
      <Toaster position="top-center" offset={{ top: 'calc(env(safe-area-inset-top, 0px) + var(--space-3))' }}
        mobileOffset={{ top: 'calc(env(safe-area-inset-top, 0px) + var(--space-3))' }} />
    </>
  )
}
