import { useEffect, useRef, useState } from 'react'
import { Link, Outlet, createRootRoute, createRoute, createRouter, redirect, useLocation, useNavigate } from '@tanstack/react-router'
import {
  CalendarCheck, CloudAlert, CloudCheck, CloudDownload, CloudOff, CloudUpload, HeartPulse, ListChecks, Route as RouteIcon, MoreHorizontal, NotebookPen,
  Settings as SettingsIcon, Timer as TimerIcon, type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { Toaster } from '@/shared/ui/primitives/sonner'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/shared/ui/primitives/dialog'
import { BarBack, BarMenu, BarProvider, useBar } from '@/shared/ui/page-bar'
import { TopicColors } from '@/shared/ui/kit'
import { seedOps } from '@/app/seed/seed'
import { mountFx } from '@/shared/fx/fx'
import { startReminderLoop } from '@/shared/fx/notify'
import { keyOf } from '@/shared/lib/dates'
import { todayItems } from '@/entities/today/model/derive'
import { useStore, type SyncState } from '@/shared/store/StoreProvider'
import { TopicIndex, Topics } from '@/pages/topics/ui/TopicsPage'
import { Wellbeing } from '@/pages/wellbeing/ui/WellbeingPage'
import { ListPage, Lists } from '@/pages/lists/ui/ListsPage'
import { Notebook } from '@/pages/notebook/ui/NotebookPage'
import { Settings } from '@/pages/settings/ui/SettingsPage'
import { PENDING_SHARE, SharePage } from '@/pages/share/ui/SharePage'
import { SignIn } from '@/pages/sign-in/ui/SignInPage'
import { Today } from '@/pages/today/ui/TodayPage'
import { Timer } from '@/pages/timer/ui/TimerPage'
import { clock, remaining, useTimer } from '@/features/timer/model/timer'
import { t } from '@/shared/i18n'

type Tab = { to: '/today' | '/topics' | '/notebook' | '/lists' | '/wellbeing' | '/timer' | '/settings'; label: string; icon: LucideIcon }

// Phones: MAIN in the bottom bar, MORE in its sheet.
const MAIN: Tab[] = [
  { to: '/today', label: t.nav.tabs.today, icon: CalendarCheck },
  { to: '/topics', label: t.nav.tabs.topics, icon: RouteIcon },
  { to: '/notebook', label: t.nav.tabs.notebook, icon: NotebookPen },
  { to: '/wellbeing', label: t.nav.tabs.wellbeing, icon: HeartPulse },
]
const MORE: Tab[] = [
  { to: '/lists', label: t.nav.tabs.lists, icon: ListChecks },
  { to: '/timer', label: t.nav.tabs.timer, icon: TimerIcon },
  { to: '/settings', label: t.nav.tabs.settings, icon: SettingsIcon },
]
// Wide screens show every view as a tab, in this order.
const TABS = [MAIN[0], MAIN[1], MAIN[2], MORE[0], MAIN[3], MORE[1], MORE[2]]

function BottomNav() {
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

function SyncIcon({ sync }: { sync: SyncState }) {
  const state = sync === 'loadError' || sync === 'saveError' ? 'error' : sync
  const tipText = t.nav.sync[sync]
  const Icon = { loading: CloudDownload, saving: CloudUpload, error: CloudAlert, synced: CloudCheck, local: CloudOff }[state]
  const [tip, setTip] = useState(false)
  useEffect(() => {
    if (!tip) return
    const id = setTimeout(() => setTip(false), 2200)
    return () => clearTimeout(id)
  }, [tip])
  // Tap shows the tooltip on phones; hover and focus show it elsewhere.
  return (
    <button type="button" className={`sync${tip ? ' tip-open' : ''}`} data-state={state} data-tip={tipText} aria-label={tipText} onClick={() => setTip(true)}>
      <Icon aria-hidden="true" />
    </button>
  )
}

// Fills a new account with the starting roadmap, or replaces content from an older seed version.
// Returns true while that is pending, so pages never render content in an old shape.
function useSeed() {
  const { ready, state, dispatch } = useStore()
  const done = useRef(false)
  const pending = ready && seedOps(state).length > 0
  useEffect(() => {
    if (!pending || done.current) return
    done.current = true
    dispatch({ type: 'batch', ops: seedOps(state) })
  }, [pending, state, dispatch])
  return pending
}

// While the timer runs, other pages show the time left in the top bar. Tapping it opens the timer.
function TimerPill() {
  const { state, now } = useTimer()
  const { pathname } = useLocation()
  if (!state.endsAt || pathname === '/timer') return null
  return (
    <Link to="/timer" className="bar-timer" aria-label={t.nav.timerLeft(clock(remaining(state, now)))}>
      <TimerIcon aria-hidden="true" />{clock(remaining(state, now))}
    </Link>
  )
}

// Top-level pages show the brand and sync state; inner pages show only their back link. The right side is the page's ⋯ menu.
function TopBar({ sync }: { sync: SyncState }) {
  const bar = useBar()
  return (
    <header className="top">
      <div className="flex min-w-0 items-center gap-2">
        {bar?.back ? <BarBack {...bar.back} /> : <Link to="/today" className="brand text-foreground no-underline"><span className="brand-mark" aria-hidden="true" />Compound</Link>}
        {!bar?.back && <SyncIcon sync={sync} />}
      </div>
      {/* Keeps the bar the same height on pages without a ⋯. */}
      <div className="flex min-h-(--control-md) min-w-0 items-center gap-1">
        <TimerPill />
        <BarMenu bar={bar} />
      </div>
    </header>
  )
}

function Shell() {
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
    // Shown once the shell has settled. The flag is cleared
    // inside the timer so StrictMode's mount-unmount-mount doesn't drop the toast.
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
        const done = new Set(s.days[keyOf(new Date())]?.done ?? [])
        return todayItems(s, new Date()).filter((i) => !(i.done ?? done.has(i.id))).length
      }, () => keyOf(new Date())),
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

const root = createRootRoute({ component: () => <BarProvider><Shell /></BarProvider> })
const page = (path: string, component: () => React.ReactNode) => createRoute({ getParentRoute: () => root, path, component })

const routeTree = root.addChildren([
  createRoute({ getParentRoute: () => root, path: '/', beforeLoad: () => { throw redirect({ to: '/today' }) } }),
  page('/today', Today),
  page('/topics', TopicIndex),
  page('/topics/$ch', Topics),
  page('/notebook', Notebook),
  page('/lists', Lists),
  page('/lists/$id', ListPage),
  page('/wellbeing', Wellbeing),
  page('/timer', Timer),
  page('/settings', Settings),
  page('/share/$id', SharePage),
])

export const router = createRouter({ routeTree, defaultNotFoundComponent: () => <div className="empty">{t.nav.notFound}</div> })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
