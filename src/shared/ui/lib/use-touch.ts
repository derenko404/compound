import { useSyncExternalStore } from 'react'

const TOUCH = '(pointer: coarse)'
const watch = (on: () => void) => {
  const m = matchMedia(TOUCH)
  m.addEventListener('change', on)
  return () => m.removeEventListener('change', on)
}

// Whether the main input is a finger (phones, tablets): they get native pickers, a mouse gets ours.
export const useTouch = () => useSyncExternalStore(watch, () => matchMedia(TOUCH).matches)
