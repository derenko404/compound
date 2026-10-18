import { useEffect, useRef, useState } from 'react'
import { Link, Outlet, createRootRoute, createRoute, createRouter, redirect, useLocation } from '@tanstack/react-router'
import {
  BookOpen, CalendarCheck, CloudAlert, CloudCheck, CloudDownload, CloudOff, CloudUpload, HeartPulse, Lightbulb, Link2, ListChecks, Map as MapIcon, MoreHorizontal, NotebookPen,
  Settings as SettingsIcon, type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { Toaster } from '@/components/ui/sonner'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { ChapterColors } from '@/components/kit'
import { seedOps } from '@/data/seed'
import { mountFx } from '@/fx/fx'
import { startReminderLoop } from '@/fx/notify'
import { keyOf } from '@/lib/dates'
import { todayItems } from '@/lib/derive'
import { useStore } from '@/store/StoreProvider'
import { ChapterIndex, Chapters } from '@/views/Chapters'
import { Finds } from '@/views/Finds'
import { Health } from '@/views/Health'
import { Ideas } from '@/views/Ideas'
import { Lists } from '@/views/Lists'
import { Notes } from '@/views/Notes'
import { Plan } from '@/views/Plan'
import { Settings } from '@/views/Settings'
import { SignIn } from '@/views/SignIn'
import { Today } from '@/views/Today'

type Tab = { to: '/today' | '/plan' | '/chapters' | '/finds' | '/ideas' | '/lists' | '/notes' | '/health' | '/settings'; label: string; icon: LucideIcon }

// Phones: MAIN in the bottom bar, MORE in its sheet. Settings sits in the header, so it's in neither.
const MAIN: Tab[] = [
  { to: '/today', label: 'Today', icon: CalendarCheck },
  { to: '/chapters', label: 'Chapters', icon: BookOpen },
  { to: '/finds', label: 'Finds', icon: Link2 },
  { to: '/notes', label: 'Notes', icon: NotebookPen },
]
const MORE: Tab[] = [
  { to: '/plan', label: 'Plan', icon: MapIcon },
  { to: '/ideas', label: 'Ideas', icon: Lightbulb },
  { to: '/lists', label: 'Lists', icon: ListChecks },
  { to: '/health', label: 'Health', icon: HeartPulse },
]
// Wide screens show every view as a tab, in this order.
const TABS = [MAIN[0], MORE[0], MAIN[1], MAIN[2], MORE[1], MORE[2], MAIN[3], MORE[3]]

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

// Fills a new (or pre-editable-content) account with the original roadmap, once.
function useSeed() {
  const { ready, state, dispatch } = useStore()
  const done = useRef(false)
  useEffect(() => {
    if (!ready || done.current) return
    const ops = seedOps(state)
    if (!ops.length) return
    done.current = true
    dispatch({ type: 'batch', ops })
  }, [ready, state, dispatch])
}

function Shell() {
  const { mode, sync, ready, state } = useStore()
  useSeed()
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
        return todayItems(s, new Date()).filter((i) => !done.has(i.id)).length
      }, () => keyOf(new Date())),
    [],
  )

  return (
    <>
      <canvas id="fx" ref={fx} aria-hidden="true" />
      <div className="wrap">
        {mode === 'signin' ? <SignIn /> : (
          <>
            <header className="top">
              <div className="flex min-w-0 items-center gap-2">
                <Link to="/today" className="brand text-foreground no-underline"><span className="brand-mark" aria-hidden="true" />Roadmap Log</Link>
                <SyncIcon sync={sync} mode={mode} />
              </div>
              <div className="flex min-w-0 items-center gap-2">
                <Link to="/settings" aria-label="Settings" className="grid size-9 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground">
                  <SettingsIcon className="size-(--icon-md)" />
                </Link>
              </div>
            </header>
            <nav className="tabs" aria-label="Views">
              {TABS.map(({ to, label, icon: Icon }) => <Link key={to} to={to} className="tab"><Icon aria-hidden="true" />{label}</Link>)}
            </nav>
            <ChapterColors chapters={state.chapters} />
            <main>{ready ? <Outlet /> : <div className="empty">Loading your progress…</div>}</main>
            <BottomNav />
          </>
        )}
      </div>
      <Toaster position="bottom-center" />
    </>
  )
}

const root = createRootRoute({ component: Shell })
const page = (path: string, component: () => React.ReactNode) => createRoute({ getParentRoute: () => root, path, component })

const routeTree = root.addChildren([
  createRoute({ getParentRoute: () => root, path: '/', beforeLoad: () => { throw redirect({ to: '/today' }) } }),
  page('/today', Today),
  page('/plan', Plan),
  page('/chapters', ChapterIndex),
  page('/chapters/$ch', Chapters),
  page('/ideas', Ideas),
  page('/finds', Finds),
  page('/lists', Lists),
  page('/notes', Notes),
  page('/health', Health),
  page('/settings', Settings),
])

export const router = createRouter({ routeTree, defaultNotFoundComponent: () => <div className="empty">Page not found.</div> })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
