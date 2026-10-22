import { useLocation } from '@tanstack/react-router'
import { t } from '@/shared/i18n'
import { TABS } from './tabs'

/**
 * Back goes where you came from, as on iOS: the router records which page sits at each step of the history
 * (`backStack.record`), and an inner page's back button steps back to the one before it when that's in the app.
 * Without one (opened from a link or a reload) it goes to the page's own parent.
 */
const pages = new Map<number, string>()
let stepBack: () => void = () => history.back()

export const backStack = {
  record: (index: number, path: string) => void pages.set(index, path),
  // The router's own step back (so it can tell a back tap from a swipe).
  use: (fn: () => void) => { stepBack = fn },
}

// What a page is called on a back button: its tab, or its section in a tab (Lists), else null.
function nameOf(path: string) {
  for (const tab of TABS) {
    if (tab.to === path && !tab.sections) return tab.label
    const section = tab.sections?.find((s) => s.to === path)
    if (section) return section.label
  }
  return null
}

export function useBack(parent: { to: string; label: string }) {
  const { pathname, state } = useLocation()
  const index = (state as { __TSR_index?: number }).__TSR_index ?? 0
  const prev = pages.get(index - 1)
  if (!prev || prev === pathname) return parent
  return { to: prev, label: nameOf(prev) ?? (prev === parent.to ? parent.label : t.nav.bar.back), onClick: () => stepBack() }
}
