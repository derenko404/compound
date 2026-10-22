import { Heart, Layers, Library, Settings as SettingsIcon, Sun, type LucideIcon } from 'lucide-react'
import { t } from '@/shared/i18n'
import type { MotionDirection } from '@/shared/lib/page-motion'

type To = '/today' | '/topics' | '/notebook' | '/lists' | '/wellbeing' | '/timer' | '/settings'
export type Section = { to: To; label: string }
export type Tab = { to: To; label: string; icon: LucideIcon; sections?: Section[]; lead?: string; inner?: To[] }

/**
 * The app's views, the same on phones (bottom bar) and wider screens (top tabs). A tab with sections groups
 * several pages under one header (its title and lead), switched by a segmented control (SectionTabs); the first
 * opens by default.
 */
export const TABS: Tab[] = [
  { to: '/today', label: t.nav.tabs.today, icon: Sun },
  { to: '/topics', label: t.nav.tabs.topics, icon: Layers },
  { to: '/lists', label: t.nav.tabs.library, icon: Library, lead: t.nav.leads.library, sections: [
    { to: '/lists', label: t.nav.tabs.lists },
    { to: '/notebook', label: t.nav.tabs.notebook },
  ] },
  { to: '/wellbeing', label: t.nav.tabs.wellbeing, icon: Heart },
  { to: '/settings', label: t.nav.tabs.settings, icon: SettingsIcon },
]

const pathsOf = (tab: Tab) => [...(tab.sections?.map((s) => s.to) ?? [tab.to]), ...(tab.inner ?? [])]

// Which tab a page belongs to (inner pages too: /lists/films is Library), or -1.
export const tabOf = (pathname: string) => TABS.findIndex((tab) => pathsOf(tab).some((p) => pathname.startsWith(p)))

// Pages any tab opens (the timer, from My day, Wellbeing or anywhere): they stay under the tab you came from.
const SHARED = ['/timer']
const isShared = (pathname: string) => SHARED.some((p) => pathname.startsWith(p))
let lastTab = 0

// The tab the bars light for a page: its own, or for a shared page the one you came from.
export function tabFor(pathname: string) {
  const i = tabOf(pathname)
  if (i >= 0) lastTab = i
  return i >= 0 ? i : isShared(pathname) ? lastTab : -1
}

// The tab whose section is exactly this page, for the row of section tabs (inner pages show none).
export const sectionsAt = (pathname: string) => TABS.find((tab) => tab.sections?.some((s) => s.to === pathname))

// Each grouped tab reopens the section last seen in it, as iOS keeps a tab's place (this visit only).
const last = new Map<Tab, To>()
export const tabTarget = (tab: Tab) => last.get(tab) ?? tab.to
export const rememberSection = (tab: Tab, to: To) => void last.set(tab, to)

/**
 * How the page changes from one path to another: into an inner page (/lists/films) forward, out of it back;
 * between tabs and sections at once.
 */
export const motionBetween = (from: string, to: string): MotionDirection => {
  // A shared page opens over whatever you were on, and closes back to it.
  if (isShared(to) && !isShared(from)) return 'forward'
  if (isShared(from) && !isShared(to)) return 'back'
  const depth = (p: string) => p.split('/').filter(Boolean).length + (TABS.some((tab) => tab.inner?.some((x) => p.startsWith(x))) ? 1 : 0)
  if (tabOf(from) < 0 || tabOf(from) !== tabOf(to) || depth(from) === depth(to)) return 'none'
  return depth(to) > depth(from) ? 'forward' : 'back'
}
