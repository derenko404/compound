// Appearance: follow the system, or force light or dark. Stored per device; applied as data-theme on <html>.
export type Theme = 'system' | 'light' | 'dark'
const KEY = 'roadmap-theme'

export function getTheme(): Theme {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : 'system'
  } catch {
    return 'system'
  }
}

export function applyTheme(t: Theme = getTheme()) {
  const el = document.documentElement
  if (t === 'system') el.removeAttribute('data-theme')
  else el.setAttribute('data-theme', t)
}

export function setTheme(t: Theme) {
  try {
    localStorage.setItem(KEY, t)
  } catch {
    // Private mode: the choice lasts until reload.
  }
  applyTheme(t)
}
