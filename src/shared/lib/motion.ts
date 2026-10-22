/**
 * Motion (Settings → Motion, this device only): Auto follows the device's reduce-motion setting, On always
 * animates, Off cuts animations, transitions, confetti and page slides. Applied as data-reduce-motion on <html>,
 * which index.css reads; scripts ask `motion.reduced()`.
 */
export type MotionPref = 'auto' | 'on' | 'off'
const KEY = 'roadmap-motion'
const media = () => matchMedia('(prefers-reduced-motion: reduce)')

export const motion = {
  get(): MotionPref {
    try {
      const v = localStorage.getItem(KEY)
      return v === 'on' || v === 'off' ? v : 'auto'
    } catch {
      return 'auto'
    }
  },

  reduced(): boolean {
    const p = motion.get()
    return p === 'off' || (p === 'auto' && media().matches)
  },

  apply() {
    document.documentElement.toggleAttribute('data-reduce-motion', motion.reduced())
  },

  set(p: MotionPref) {
    try {
      if (p === 'auto') localStorage.removeItem(KEY)
      else localStorage.setItem(KEY, p)
    } catch {
      // Private mode: the choice lasts until reload.
    }
    motion.apply()
  },

  // Applies the choice now and again whenever the device's setting changes (it matters on Auto).
  watch() {
    motion.apply()
    media().addEventListener('change', motion.apply)
  },
}
