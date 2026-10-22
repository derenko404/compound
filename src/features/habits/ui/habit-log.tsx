// Logging a habit: today's tick, a slip, water's glasses and the gym's days (other amounts: amount-controls.tsx).
import { GlassWater } from 'lucide-react'
import { Button } from '@/shared/ui/primitives/button'
import { CountRow, DoneButton } from '@/shared/ui'
import { burst } from '@/shared/lib/celebrate'
import { playTick, playUntick } from '@/shared/lib/sound'
import { dates } from '@/shared/lib/dates'
import type { Habit } from '@core/domain/types'
import { useStore } from '@/shared/store/StoreProvider'
import { t } from '@/shared/i18n'
import { DONE, SLIP, amountStats, gymStats, valueOn, weekOf } from '../model/habits'

const W = t.wellbeing

function useHabitLog(h: Habit) {
  const { state, dispatch } = useStore()
  const k = dates.keyOf(new Date())
  return {
    value: valueOn(state, h, k),
    set: (value: number | null) => dispatch({ type: 'habitLog', habit: h.id, day: k, value }),
  }
}

// Today's tick for a habit, with the app's sound and burst.
export function HabitDone({ h, label, done }: { h: Habit; label: string; done?: string }) {
  const log = useHabitLog(h)
  return <DoneButton on={log.value === DONE} label={label} done={done} onToggle={(v) => log.set(v ? DONE : null)} />
}

export function SlipButton({ h }: { h: Habit }) {
  const log = useHabitLog(h)
  if (log.value === SLIP) return <Button variant="outline" onClick={() => log.set(null)}>{W.slip.undo}</Button>
  return (
    <Button variant="outline" onClick={() => log.set(SLIP)}>{W.slip.log}</Button>
  )
}

// Today's glasses as a row to tap: fill one more, or tap the last filled one to take it back.
export function WaterCount({ h }: { h: Habit }) {
  const { state } = useStore()
  const log = useHabitLog(h)
  const { today: n, target } = amountStats(state, { ...h, type: 'water' }, new Date())
  return <CountRow n={n} target={target} onSet={(v) => log.set(v || null)} icon={GlassWater} unit={W.water.unit} />
}

/**
 * This week, Monday first, one button per day: tap a day to log a workout on it or take it back. Gym days are
 * ringed, logged ones filled. Days still ahead can't be logged.
 */
export function GymWeek({ h }: { h: Habit }) {
  const { state, dispatch } = useStore()
  const today = new Date()
  const k = dates.keyOf(today)
  const toggle = (day: string, on: boolean, el: HTMLElement) => {
    if (on) {
      const { week, perWeek } = gymStats(state, h, today)
      playTick(Math.min(1, (week + 1) / perWeek))
      burst(el, 20)
    } else playUntick()
    dispatch({ type: 'habitLog', habit: h.id, day, value: on ? DONE : null })
  }
  return (
    <span className="gym-days">
      {weekOf(today).map((d) => {
        const dk = dates.keyOf(d)
        const done = valueOn(state, h, dk) === DONE
        const gym = h.days.includes(d.getDay())
        return (
          <button key={dk} type="button" className={done ? 'on' : gym ? 'due' : undefined} disabled={dk > k}
            aria-pressed={done} aria-label={W.gym.day(t.nav.weekdays[d.getDay()])}
            onClick={(e) => toggle(dk, !done, e.currentTarget)}>
            {t.nav.weekdaysShort[d.getDay()][0]}
          </button>
        )
      })}
    </span>
  )
}
