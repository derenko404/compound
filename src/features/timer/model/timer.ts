/**
 * The focus timer: one countdown of a chosen length (short, long or custom) that ends with a fanfare.
 * It keeps running across pages and reloads: the state lives here and in localStorage (this device only), and
 * components read it with useTimer(). Nothing is saved to the account.
 */
import { useSyncExternalStore } from 'react'
import { celebrate } from '@/shared/lib/celebrate'
import { playAmbient, playFanfare, type Ambient } from '@/shared/lib/sound'
import { requestPermission, show, supported } from '@/shared/lib/reminders'
import { t } from '@/shared/i18n'

export type Length = 'short' | 'long' | 'custom'
// Minutes for each length, and the background sound while it runs.
export type TimerSettings = Record<Length, number> & { sound: Ambient }
// endsAt while running; left (ms) while paused.
export interface TimerState { length: Length; endsAt: number | null; left: number }

export const LENGTH_LABEL: Record<Length, string> = t.timer.lengths
export const TIMER_DEFAULTS: TimerSettings = { short: 5, long: 30, custom: 15, sound: 'off' }
export const CUSTOM_MAX = 180
// Custom minutes go 1 to 5 one at a time, then in fives.
export const customStep = (m: number, up: boolean) => Math.min(CUSTOM_MAX, Math.max(1, up ? (m < 5 ? m + 1 : m + 5) : (m > 5 ? m - 5 : m - 1)))

const KEY = 'roadmap-timer'
// Only what differs from TIMER_DEFAULTS is stored, so a change to the defaults reaches everyone who kept them.
const SETTINGS_KEY = 'roadmap-timer-prefs'
const TITLE = document.title

const read = <T extends object>(key: string, fallback: T): T => {
  try {
    return { ...fallback, ...JSON.parse(localStorage.getItem(key) ?? '{}') }
  } catch {
    return fallback
  }
}
const write = (key: string, v: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(v))
  } catch {
    // Private mode or full storage: the timer still works until the page closes.
  }
}

let settings = read(SETTINGS_KEY, TIMER_DEFAULTS)
export const lengthOf = (l: Length) => settings[l] * 60_000
let state = read<TimerState>(KEY, { length: 'short', endsAt: null, left: lengthOf('short') })
// An older saved shape (focus and breaks) starts fresh.
if (!(state.length in LENGTH_LABEL)) state = { length: 'short', endsAt: null, left: lengthOf('short') }
// A paused clock longer than its length (the length was shortened since) starts again at the new length.
if (!state.endsAt && state.left > lengthOf(state.length)) state = { ...state, left: lengthOf(state.length) }

export const remaining = (s: TimerState, now = Date.now()) => (s.endsAt ? Math.max(0, s.endsAt - now) : s.left)
export const clock = (ms: number) => {
  const s = Math.ceil(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/* ---------- Store ---------- */

let snapshot = { state, settings, now: Date.now() }
const listeners = new Set<() => void>()
let ticker: number | undefined

function emit() {
  snapshot = { state, settings, now: Date.now() }
  listeners.forEach((l) => l())
  // While running, the tab shows the time left, as timer apps do.
  document.title = state.endsAt ? `${clock(remaining(state))} · ${t.timer.title}` : TITLE
}

function set(next: TimerState) {
  state = next
  write(KEY, state)
  // A tick each second only while running.
  if (state.endsAt && ticker === undefined) ticker = window.setInterval(tick, 1000)
  if (!state.endsAt && ticker !== undefined) {
    window.clearInterval(ticker)
    ticker = undefined
  }
  // The background sound plays only while the clock runs.
  playAmbient(state.endsAt ? settings.sound : 'off')
  emit()
}

function tick() {
  if (state.endsAt && remaining(state) === 0) finish(true)
  else emit()
}

/**
 * Time's up: back to the full length, paused. Loud: a fanfare, confetti and a notification for when the app is
 * in the background.
 */
function finish(loud: boolean) {
  set({ ...state, endsAt: null, left: lengthOf(state.length) })
  if (!loud) return
  playFanfare()
  celebrate()
  void show(t.timer.timesUp, t.timer.minutesDone(settings[state.length]))
}

// A countdown that ended while the app was closed resets quietly.
if (state.endsAt && remaining(state) === 0) finish(false)
else set(state)

/* ---------- Actions ---------- */

export const timer = {
  start: () => state.endsAt || set({ ...state, endsAt: Date.now() + state.left }),
  // Start from a button: the first time it asks once for notifications, so time's up reaches you in another app.
  begin: () => {
    if (supported() && Notification.permission === 'default') void requestPermission()
    timer.start()
  },
  pause: () => state.endsAt && set({ ...state, endsAt: null, left: remaining(state) }),
  reset: () => set({ ...state, endsAt: null, left: lengthOf(state.length) }),
  // Picking a length stops the clock at that length.
  length: (length: Length) => set({ length, endsAt: null, left: lengthOf(length) }),
  settings: (next: TimerSettings) => {
    const fresh = !state.endsAt && state.left === lengthOf(state.length)
    settings = next
    write(SETTINGS_KEY, Object.fromEntries(Object.entries(settings).filter(([k, v]) => TIMER_DEFAULTS[k as keyof TimerSettings] !== v)))
    // A clock that hasn't started takes the new length at once.
    set(fresh ? { ...state, left: lengthOf(state.length) } : state)
  },
}

export function useTimer() {
  return useSyncExternalStore((l) => {
    listeners.add(l)
    return () => listeners.delete(l)
  }, () => snapshot)
}
