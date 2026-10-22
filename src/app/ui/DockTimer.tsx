import type { CSSProperties } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { clock, lengthOf, remaining, useTimer } from '@/features/timer'
import { t } from '@/shared/i18n'

// Whether a focus session is under way (running, or paused partway) away from the timer's own page.
export function useTimerShown() {
  const { state, now } = useTimer()
  const { pathname } = useLocation()
  const left = remaining(state, now)
  return (!!state.endsAt || left !== lengthOf(state.length)) && pathname !== '/timer'
}

// Phones: while a session is under way, the tab bar's round button is the timer: a ring filling with the time gone and the time left; it opens the timer.
export function DockTimer() {
  const { state, now } = useTimer()
  const left = remaining(state, now)
  const total = lengthOf(state.length)
  return (
    <Link to="/timer" className="dock-search dock-timer" data-paused={!state.endsAt || undefined} style={{ '--p': 1 - left / total } as CSSProperties}
      aria-label={t.nav.timerLeft(clock(left))}>
      {clock(left)}
    </Link>
  )
}
