import { createRootRoute, createRoute, createRouter, redirect } from '@tanstack/react-router'
import { BarProvider } from '@/shared/ui'
import { TopicIndex, Topics } from '@/pages/topics'
import { Wellbeing } from '@/pages/wellbeing'
import { ListPage, Lists } from '@/pages/lists'
import { Notebook } from '@/pages/notebook'
import { Settings } from '@/pages/settings'
import { SharePage } from '@/pages/share'
import { Today } from '@/pages/today'
import { Timer } from '@/pages/timer'
import { t } from '@/shared/i18n'
import { Shell } from '@/app/ui/Shell'

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
