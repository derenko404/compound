import { motion } from './motion'

export type MotionDirection = 'forward' | 'back' | 'none'

/**
 * How the page changes, as on iOS: opening an inner page pushes it in from the right over the one below (forward),
 * going back pops it off (back); switching tabs or sections is instant, only their controls move (none). Uses the
 * browser's view transitions (index.css styles them); the bars stay put, they have their own view-transition-name.
 */
export const pageMotion = {
  // Sets the direction for the next page change (the router reads it).
  set(dir: MotionDirection) {
    document.documentElement.dataset.motion = dir
  },
  // Whether the next page change should animate: pushes and pops on touch devices (phones, tablets); with a mouse at once.
  animates() {
    const dir = document.documentElement.dataset.motion
    return (dir === 'forward' || dir === 'back') && !motion.reduced() && matchMedia('(pointer: coarse)').matches
  },
}
