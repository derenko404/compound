import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router'
import { BarProvider } from '@/shared/ui'
import { ProjectPage, TopicIndex, Topics } from '@/pages/topics'
import { Wellbeing } from '@/pages/wellbeing'
import { ListPage, Lists } from '@/pages/lists'
import { Notebook } from '@/pages/notebook'
import { Settings } from '@/pages/settings'
import { SharePage } from '@/pages/share'
import { Landing } from '@/pages/landing'
import { Privacy, Terms } from '@/pages/legal'
import { Today } from '@/pages/today'
import { Timer } from '@/pages/timer'
import { t } from '@/shared/i18n'
import { Shell } from '@/app/ui/Shell'
import { motionBetween } from '@/app/ui/tabs'
import { backStack } from '@/app/ui/back'
import { pageMotion } from '@/shared/lib/page-motion'

const root = createRootRoute({ component: () => <BarProvider><Shell /></BarProvider> })
const page = <P extends string>(path: P, component: () => React.ReactNode) => createRoute({ getParentRoute: () => root, path, component })

const routeTree = root.addChildren([
  page('/', Landing),
  page('/privacy', Privacy),
  page('/terms', Terms),
  page('/today', Today),
  page('/topics', TopicIndex),
  page('/topics/$ch', Topics),
  page('/topics/$ch/projects/$project', ProjectPage),
  page('/notebook', Notebook),
  page('/lists', Lists),
  page('/lists/$id', ListPage),
  page('/wellbeing', Wellbeing),
  page('/timer', Timer),
  page('/settings', Settings),
  page('/share/$id', SharePage),
])

export const router = createRouter({
  routeTree,
  defaultNotFoundComponent: () => <div className="empty">{t.nav.notFound}</div>,
  // Inner pages push in and pop out as on iOS (pageMotion); everything else changes at once.
  defaultViewTransition: true,
})
router.subscribe('onBeforeNavigate', ({ fromLocation, toLocation }) => fromLocation && pageMotion.set(motionBetween(fromLocation.pathname, toLocation.pathname)))
// A back or forward swipe (a history move, not a link) is animated by the browser already; ours would play it twice.
let historyMove = false
// Our back button steps back through the history too, but nothing animates it, so it keeps our transition.
let backTap = false
router.history.subscribe(({ action }) => {
  historyMove = action.type !== 'PUSH' && action.type !== 'REPLACE' && !backTap
  backTap = false
})
backStack.use(() => {
  backTap = true
  router.history.back()
})
// Which page sits at each step of the history, for back buttons that return where you came from.
router.subscribe('onResolved', ({ toLocation }) => backStack.record((toLocation.state as { __TSR_index?: number }).__TSR_index ?? 0, toLocation.pathname))
// No transition at all unless the page animates: an instant one would still flash both pages for a frame.
const startTransition = router.startViewTransition
router.startViewTransition = (fn) => (pageMotion.animates() && !historyMove ? startTransition(fn) : void fn())

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
