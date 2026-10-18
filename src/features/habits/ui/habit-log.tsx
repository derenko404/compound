// Logging today's value for a habit: the tick, a slip and water's glasses.
import { GlassWater } from 'lucide-react'
import { Button } from '@/shared/ui/primitives/button'
import { CountRow, DoneButton } from '@/shared/ui'
import { dates } from '@/shared/lib/dates'
import type { Habit } from '@core/domain/types'
import { useStore } from '@/shared/store/StoreProvider'
import { t } from '@/shared/i18n'
import { DONE, SLIP, valueOn, waterStats } from '../model/habits'

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
  const { today: n, target } = waterStats(state, h, new Date())
  return <CountRow n={n} target={target} onSet={(v) => log.set(v || null)} icon={GlassWater} unit={W.water.unit} />
}
