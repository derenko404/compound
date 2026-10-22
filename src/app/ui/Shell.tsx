import { useEffect, useRef } from 'react'
import { Outlet, useLocation, useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Toaster } from '@/shared/ui/primitives/sonner'
import { TopicColors } from '@/shared/ui'
import { mountFx } from '@/shared/lib/celebrate'
import { startReminderLoop } from '@/shared/lib/reminders'
import { appBadge } from '@/shared/lib/app-badge'
import { reminders } from '@core/domain/reminders'
import { dates } from '@/shared/lib/dates'
import { todayItems } from '@/features/today'
import { useStore } from '@/shared/store/StoreProvider'
import { PENDING_SHARE, SignIn } from '@/features/auth'
import { t } from '@/shared/i18n'
import { useSeed } from '@/app/seed/use-seed'
import { SearchSheet } from '@/features/search'
import { pushReminders } from '@/features/reminders'
import { supabase } from '@/shared/api/backends'
import { useFirstRunTour } from '@/features/tour'
import { TopBar } from './TopBar'
import { BottomNav } from './BottomNav'
import { TopTabs } from './TopTabs'
import { SectionTabs } from './SectionTabs'

export function Shell() {
  const { mode, sync, ready, state } = useStore()
  const { pathname } = useLocation()
  const nav = useNavigate()
  /**
   * Pages that open without an account: the landing page, the legal pages and shared links. Signing in from a
   * shared link (Google lands on /today) comes back to finish adding.
   */
  const open = pathname === '/' || pathname === '/privacy' || pathname === '/terms' || pathname.startsWith('/share/')
  useEffect(() => {
    if (mode === 'signin' || !ready) return
    const id = localStorage.getItem(PENDING_SHARE)
    if (!id) return
    localStorage.removeItem(PENDING_SHARE)
    if (pathname !== `/share/${id}`) void nav({ to: '/share/$id', params: { id } })
  }, [mode, ready, pathname, nav])
  const seeding = useSeed()
  useFirstRunTour(mode !== 'signin' && ready && !seeding, pathname)
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
  // Signed in with push, the worker sends reminders; keep its copy of this device's time zone and language fresh.
  const pushOn = mode === 'cloud' && !!supabase && pushReminders.supported()
  useEffect(() => {
    if (pushOn && ready) void pushReminders.sync(supabase!)
  }, [pushOn, ready])
  // The icon's badge: own tasks and habits left today, the same count as the reminders. Rechecked on return, as the day may have changed.
  const signedOut = mode === 'signin'
  useEffect(() => {
    if (signedOut) { appBadge.set(0); return }
    if (!ready) return
    const update = () => appBadge.set(reminders.ownToday(stateRef.current, new Date()).left.length)
    update()
    const onShow = () => { if (document.visibilityState === 'visible') update() }
    document.addEventListener('visibilitychange', onShow)
    return () => document.removeEventListener('visibilitychange', onShow)
  }, [signedOut, ready, state])
  // Otherwise the open app reminds by itself.
  useEffect(
    () => pushOn ? undefined :
      startReminderLoop(() => {
        const s = stateRef.current
        const done = new Set(s.days[dates.keyOf(new Date())]?.done ?? [])
        return todayItems(s, new Date()).filter((i) => !(i.done ?? done.has(i.id))).length
      }, () => dates.keyOf(new Date())),
    [pushOn],
  )

  return (
    <>
      <canvas id="fx" ref={fx} aria-hidden="true" />
      <div className="wrap">
        {mode === 'signin' || (mode === 'loading' && pathname === '/') ? (open ? <main><Outlet /></main> : <SignIn />) : (
          <>
            <TopBar sync={sync} />
            <TopTabs />
            <TopicColors topics={state.topics} />
            <main>{ready && !seeding ? <><SectionTabs /><Outlet /></> : <div className="empty">{t.nav.loadingProgress}</div>}</main>
            <BottomNav />
            <SearchSheet />
          </>
        )}
      </div>
      {/* Toasts at the top, below the iPhone's status bar / notch. */}
      <Toaster position="top-center" offset={{ top: 'calc(env(safe-area-inset-top, 0px) + var(--space-3))' }}
        mobileOffset={{ top: 'calc(env(safe-area-inset-top, 0px) + var(--space-3))' }} />
    </>
  )
}
