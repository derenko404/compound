import { driver, type DriveStep } from 'driver.js'
import { motion } from '@/shared/lib/motion'
import 'driver.js/dist/driver.css'
import { t } from '@/shared/i18n'

const tx = t.onboarding.tour
const PHONE = '(max-width: 720px)'

// driver.js takes numbers, so the highlight's padding and corners are read from the tokens.
const token = (name: string) => parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name)) || 0

// A step's element, if it's on the page and shown (the tabs hide on phones, the bottom bar on wider screens).
const shown = (selector: string) => {
  const el = document.querySelector(selector)
  return el && el.getClientRects().length > 0 ? el : null
}

const steps = (): DriveStep[] => {
  const phone = matchMedia(PHONE).matches
  const nav = phone ? '.bottom-nav' : '.tabs'
  const list: [string | null, string, string][] = [
    [null, tx.welcomeTitle, tx.welcome],
    ['.today-head', tx.dayTitle, tx.day],
    ['#today-tasks', tx.tasksTitle, tx.tasks],
    ['#today-habits', tx.habitsTitle, tx.habits],
    ['#today-topics', tx.topicsTitle, tx.topics],
    ['#today-topics > .list-label', tx.focusTitle, tx.focus],
    ['#today-week', tx.weekTitle, tx.week],
    ['.top .plus-btn', tx.addTitle, tx.add],
    ['.top .bar-text', tx.editTitle, tx.edit],
    // The tabs one by one: where lists and habits live.
    [`${nav} [data-tab="/topics"]`, tx.topicsTabTitle, tx.topicsTab],
    [`${nav} [data-tab="/lists"]`, tx.libraryTitle, tx.library],
    [`${nav} [data-tab="/wellbeing"]`, tx.wellbeingTitle, tx.wellbeing],
    [phone ? '.dock-search' : '.bar-search', tx.searchTitle, phone ? tx.search : tx.searchKeys],
  ]
  return list.flatMap(([selector, title, description]) => {
    if (!selector) return [{ popover: { title, description } }]
    const el = shown(selector)
    return el ? [{ element: el, popover: { title, description } }] : []
  })
}

// Runs the tour over the page as it is now. Closing it early counts as seen too.
export function runTour(onEnd: () => void) {
  const d = driver({
    steps: steps(),
    animate: !motion.reduced(),
    popoverClass: 'tour',
    overlayColor: 'black',
    overlayOpacity: 0.45,
    stagePadding: token('--space-2'),
    stageRadius: token('--radius-md'),
    disableActiveInteraction: true,
    showProgress: true,
    progressText: tx.progress,
    nextBtnText: tx.next,
    prevBtnText: tx.back,
    doneBtnText: tx.done,
    closeBtnLabel: t.common.close,
    // Back to the top, where the install banner shows next.
    onDestroyed: () => {
      onEnd()
      scrollTo({ top: 0, behavior: motion.reduced() ? 'auto' : 'smooth' })
    },
  })
  d.drive()
}
