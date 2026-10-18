import { useEffect, useRef, useState } from 'react'
import { Link, Outlet, createRootRoute, createRoute, createRouter, redirect, useLocation } from '@tanstack/react-router'
import {
  CalendarCheck, CloudAlert, CloudCheck, CloudDownload, CloudOff, CloudUpload, HeartPulse, ListChecks, Route as RouteIcon, MoreHorizontal, NotebookPen,
  Settings as SettingsIcon, type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { Toaster } from '@/components/ui/sonner'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { BarBack, BarMenu, BarProvider, useBar } from '@/components/bar'
import { ChapterColors } from '@/components/kit'
import { seedOps } from '@/data/seed'
import { mountFx } from '@/fx/fx'
import { startReminderLoop } from '@/fx/notify'
import { keyOf } from '@/lib/dates'
import { todayItems } from '@/lib/derive'
import { useStore } from '@/store/StoreProvider'
import { ChapterIndex, Chapters } from '@/views/Chapters'
import { Wellbeing } from '@/views/Wellbeing'
import { ListPage, Lists } from '@/views/Lists'
import { Notebook } from '@/views/Notebook'
import { Settings } from '@/views/Settings'
import { SignIn } from '@/views/SignIn'
import { Today } from '@/views/Today'

type Tab = { to: '/today' | '/tracks' | '/notebook' | '/lists' | '/wellbeing' | '/settings'; label: string; icon: LucideIcon }

// Phones: MAIN in the bottom bar, MORE in its sheet.
const MAIN: Tab[] = [
  { to: '/today', label: 'Today', icon: CalendarCheck },
  { to: '/tracks', label: 'Tracks', icon: RouteIcon },
  { to: '/notebook', label: 'Notebook', icon: NotebookPen },
  { to: '/wellbeing', label: 'Wellbeing', icon: HeartPulse },
]
const MORE: Tab[] = [
  { to: '/lists', label: 'Lists', icon: ListChecks },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
]
// Wide screens show every view as a tab, in this order.
const TABS = [MAIN[0], MAIN[1], MAIN[2], MORE[0], MAIN[3], MORE[1]]

function BottomNav() {
  const [more, setMore] = useState(false)
  const { pathname } = useLocation()
  const inMore = MORE.some((t) => pathname.startsWith(t.to))
  useEffect(() => setMore(false), [pathname])
  return (
    <nav className="bottom-nav" aria-label="Views">
      {MAIN.map(({ to, label, icon: Icon }) => <Link key={to} to={to} className="bnav"><Icon aria-hidden="true" />{label}</Link>)}
      <button className={`bnav${inMore ? ' active' : ''}`} aria-expanded={more} onClick={() => setMore(true)}><MoreHorizontal aria-hidden="true" />More</button>
      <Dialog open={more} onOpenChange={setMore}>
        <DialogContent>
          <DialogTitle>More</DialogTitle>
          <DialogDescription className="sr-only">Other views</DialogDescription>
          <div className="more-grid">
            {MORE.map(({ to, label, icon: Icon }) => <Link key={to} to={to} className="more-item"><Icon aria-hidden="true" />{label}</Link>)}
          </div>
        </DialogContent>
      </Dialog>
    </nav>
  )
}

function SyncIcon({ sync, mode }: { sync: string; mode: string }) {
  const state = sync.startsWith('Loading') ? 'loading' : sync.startsWith('Saving') ? 'saving' : sync.startsWith("Couldn't") ? 'error' : mode === 'cloud' ? 'synced' : 'local'
  const Icon = { loading: CloudDownload, saving: CloudUpload, error: CloudAlert, synced: CloudCheck, local: CloudOff }[state]
  const [tip, setTip] = useState(false)
  useEffect(() => {
    if (!tip) return
    const t = setTimeout(() => setTip(false), 2200)
    return () => clearTimeout(t)
  }, [tip])
  // Tap shows the tooltip on phones; hover and focus show it elsewhere.
  return (
    <button type="button" className={`sync${tip ? ' tip-open' : ''}`} data-state={state} data-tip={sync} aria-label={sync} onClick={() => setTip(true)}>
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

// Top-level pages show the brand and sync state; inner pages show only their back link. The right side is the page's ⋯ menu.
function TopBar({ sync, mode }: { sync: string; mode: string }) {
  const bar = useBar()
  return (
    <header className="top">
      <div className="flex min-w-0 items-center gap-2">
        {bar?.back ? <BarBack {...bar.back} /> : <Link to="/today" className="brand text-foreground no-underline"><span className="brand-mark" aria-hidden="true" />Roadmap Log</Link>}
        {!bar?.back && <SyncIcon sync={sync} mode={mode} />}
      </div>
      {/* Keeps the bar the same height on pages without a ⋯. */}
      <div className="flex min-h-(--control-md) min-w-0 items-center gap-1">
        <BarMenu bar={bar} />
      </div>
    </header>
  )
}

function Shell() {
  const { mode, sync, ready, state } = useStore()
  const seeding = useSeed()
  const fx = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => (fx.current ? mountFx(fx.current) : undefined), [])
  useEffect(() => {
    if (!sessionStorage.getItem('roadmap-just-updated')) return
    // Shown once the shell has settled. The flag is cleared
    // inside the timer so StrictMode's mount-unmount-mount doesn't drop the toast.
    const t = setTimeout(() => {
      sessionStorage.removeItem('roadmap-just-updated')
      toast.success('App updated.')
    }, 500)
    return () => clearTimeout(t)
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
        {mode === 'signin' ? <SignIn /> : (
          <>
            <TopBar sync={sync} mode={mode} />
            <nav className="tabs" aria-label="Views">
              {TABS.map(({ to, label, icon: Icon }) => <Link key={to} to={to} className="tab"><Icon aria-hidden="true" />{label}</Link>)}
            </nav>
            <ChapterColors chapters={state.chapters} />
            <main>{ready && !seeding ? <Outlet /> : <div className="empty">Loading your progress…</div>}</main>
            <BottomNav />
          </>
        )}
      </div>
      <Toaster position="bottom-center" />
    </>
  )
}

const root = createRootRoute({ component: () => <BarProvider><Shell /></BarProvider> })
const page = (path: string, component: () => React.ReactNode) => createRoute({ getParentRoute: () => root, path, component })

const routeTree = root.addChildren([
  createRoute({ getParentRoute: () => root, path: '/', beforeLoad: () => { throw redirect({ to: '/today' }) } }),
  page('/today', Today),
  page('/tracks', ChapterIndex),
  page('/tracks/$ch', Chapters),
  page('/notebook', Notebook),
  page('/lists', Lists),
  page('/lists/$id', ListPage),
  page('/wellbeing', Wellbeing),
  page('/settings', Settings),
])

export const router = createRouter({ routeTree, defaultNotFoundComponent: () => <div className="empty">Page not found.</div> })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
