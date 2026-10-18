import { useSyncExternalStore } from 'react'

// Whether the search sheet is open. Anything can open it (the More sheet, the top bar, ⌘K); the sheet lives in the shell.
let open = false
const listeners = new Set<() => void>()
const set = (v: boolean) => {
  open = v
  listeners.forEach((l) => l())
}

export const searchSheet = {
  open: () => set(true),
  close: () => set(false),
  set,
}

export const useSearchOpen = () =>
  useSyncExternalStore((l) => {
    listeners.add(l)
    return () => listeners.delete(l)
  }, () => open)
