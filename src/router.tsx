import { useEffect, useRef } from 'react'
import { Link, Outlet, createRootRoute, createRoute, createRouter, redirect } from '@tanstack/react-router'
import { Settings as SettingsIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Toaster } from '@/components/ui/sonner'
import { mountFx } from '@/fx/fx'
import { startReminderLoop } from '@/fx/notify'
import { keyOf } from '@/lib/dates'
import { todayItems } from '@/lib/derive'
import { useStore } from '@/store/StoreProvider'
import { Chapters } from '@/views/Chapters'
import { Health } from '@/views/Health'
import { Ideas } from '@/views/Ideas'
import { Lists } from '@/views/Lists'
import { Notes } from '@/views/Notes'
import { Plan } from '@/views/Plan'
import { Settings } from '@/views/Settings'
import { SignIn } from '@/views/SignIn'
import { Today } from '@/views/Today'

const TABS = [
  ['/today', 'Today'], ['/plan', 'Plan'], ['/chapters', 'Chapters'], ['/ideas', 'Ideas'],
  ['/lists', 'Lists'], ['/notes', 'Notes'], ['/health', 'Health'],
] as const

function Shell() {
  const { mode, sync, ready, state } = useStore()
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
              <Link to="/today" className="brand text-foreground no-underline"><span className="brand-mark" aria-hidden="true" />Roadmap Log</Link>
              <div className="flex min-w-0 items-center gap-2">
                <span className="sync">{sync}</span>
                <Link to="/settings" aria-label="Settings" className="grid size-9 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground">
                  <SettingsIcon className="size-[18px]" />
                </Link>
              </div>
            </header>
            <nav className="tabs" aria-label="Views">
              {TABS.map(([to, label]) => <Link key={to} to={to} className="tab">{label}</Link>)}
            </nav>
            <main>{ready ? <Outlet /> : <div className="empty">Loading your progress…</div>}</main>
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
  createRoute({ getParentRoute: () => root, path: '/chapters', beforeLoad: () => { throw redirect({ to: '/chapters/$ch', params: { ch: 'tech' } }) } }),
  page('/chapters/$ch', Chapters),
  page('/ideas', Ideas),
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
