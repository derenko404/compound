import { useSyncExternalStore } from 'react'

// Whether this device has seen the first-run tour. The install banner waits for it.
const KEY = 'roadmap-tour'
const listeners = new Set<() => void>()

const seen = () => {
  try { return localStorage.getItem(KEY) === '1' } catch { return true }
}

const markSeen = () => {
  try { localStorage.setItem(KEY, '1') } catch { /* private mode: the tour may show again */ }
  listeners.forEach((l) => l())
}

// The tour and driver.js load only when it runs.
const start = () => import('./run-tour').then((m) => m.runTour(markSeen))

export const tour = { seen, markSeen, start }

export const useTourSeen = () =>
  useSyncExternalStore((l) => {
    listeners.add(l)
    return () => listeners.delete(l)
  }, seen)
