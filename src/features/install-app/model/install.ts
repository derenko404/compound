import { useSyncExternalStore } from 'react'

// Chrome's install prompt. Not in the DOM typings yet.
type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

const KEY = 'roadmap-install-dismissed'
let deferred: InstallPrompt | null = null
let installed = false
const listeners = new Set<() => void>()
const changed = () => listeners.forEach((l) => l())

/**
 * The browser fires these once, often before React mounts, so they are caught when this module loads.
 * preventDefault keeps Chrome's own mini bar away and the event for our Install button.
 */
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e as InstallPrompt
    changed()
  })
  window.addEventListener('appinstalled', () => {
    installed = true
    deferred = null
    changed()
  })
}

const standalone = () =>
  matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true

// iPhone and iPad (iPadOS reports a Mac with touch). Safari there has no install API, only Share → Add to Home Screen.
const ios = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

const dismissed = () => {
  try { return localStorage.getItem(KEY) === '1' } catch { return false }
}

const dismiss = () => {
  try { localStorage.setItem(KEY, '1') } catch { /* private mode: it may show again */ }
  changed()
}

async function prompt() {
  if (!deferred) return
  const e = deferred
  deferred = null
  await e.prompt()
  const { outcome } = await e.userChoice
  if (outcome === 'dismissed') dismiss()
  else changed()
}

// How the banner can offer the install: Chrome's prompt, the iPhone steps, or not at all.
export type InstallWay = 'prompt' | 'ios' | null
const way = (): InstallWay => {
  if (installed || standalone() || dismissed()) return null
  if (deferred) return 'prompt'
  return ios() ? 'ios' : null
}

export const install = { prompt, dismiss }

export const useInstallWay = () =>
  useSyncExternalStore((l) => {
    listeners.add(l)
    return () => listeners.delete(l)
  }, way)
