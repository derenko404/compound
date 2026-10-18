import { CalendarCheck, HeartPulse, ListChecks, NotebookPen, Route as RouteIcon, Settings as SettingsIcon, Timer as TimerIcon, type LucideIcon } from 'lucide-react'
import { t } from '@/shared/i18n'

type Tab = { to: '/today' | '/topics' | '/notebook' | '/lists' | '/wellbeing' | '/timer' | '/settings'; label: string; icon: LucideIcon }

// Phones: MAIN in the bottom bar, MORE in its sheet.
export const MAIN: Tab[] = [
  { to: '/today', label: t.nav.tabs.today, icon: CalendarCheck },
  { to: '/topics', label: t.nav.tabs.topics, icon: RouteIcon },
  { to: '/notebook', label: t.nav.tabs.notebook, icon: NotebookPen },
  { to: '/wellbeing', label: t.nav.tabs.wellbeing, icon: HeartPulse },
]
export const MORE: Tab[] = [
  { to: '/lists', label: t.nav.tabs.lists, icon: ListChecks },
  { to: '/timer', label: t.nav.tabs.timer, icon: TimerIcon },
  { to: '/settings', label: t.nav.tabs.settings, icon: SettingsIcon },
]
// Wide screens show every view as a tab, in this order.
export const TABS = [MAIN[0], MAIN[1], MAIN[2], MORE[0], MAIN[3], MORE[1], MORE[2]]
