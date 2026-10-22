// Each amount tracker's own control, on its card and its Today row: sleep's night bar, meditation's and reading's rings.
import type { CSSProperties } from 'react'
import { Link } from '@tanstack/react-router'
import { Minus, Play, Plus } from 'lucide-react'
import { Button } from '@/shared/ui/primitives/button'
import { Chip, Chips, Dial } from '@/shared/ui'
import { burst } from '@/shared/lib/celebrate'
import { playTick } from '@/shared/lib/sound'
import { dates } from '@/shared/lib/dates'
import type { Habit } from '@core/domain/types'
import { useStore } from '@/shared/store/StoreProvider'
import { t } from '@/shared/i18n'
import { AMOUNTS, amountStats, amountText, type AmountType } from '../model/habits'

const W = t.wellbeing
type AmountHabit = Habit & { type: Exclude<AmountType, 'water'> }

// Today's amount and a setter that celebrates reaching the target.
function useAmount(h: AmountHabit) {
  const { state, dispatch } = useStore()
  const { today: n, target } = amountStats(state, h, new Date())
  const set = (v: number, el?: Element | null) => {
    if (v >= target && n < target) {
      playTick(1)
      if (el instanceof HTMLElement) burst(el, 20)
    }
    dispatch({ type: 'habitLog', habit: h.id, day: dates.keyOf(new Date()), value: v > 0 ? v : null })
  }
  return { n, target, set }
}

/**
 * Sleep: a night bar from no sleep to two hours past the goal, in half-hour steps, dusk to night; drag or tap it.
 * The goal is marked on it, and chips set the usual nights in one tap.
 */
function SleepBar({ h }: { h: AmountHabit }) {
  const { n, target, set } = useAmount(h)
  const max = target + 2
  const unit = W.amounts.sleep.unit
  return (
    <div className="sleep-log">
      <div className="night" style={{ '--pct': `${(Math.min(n, max) / max) * 100}%`, '--goal': target / max } as CSSProperties}>
        <i className="night-goal" aria-hidden="true" />
        <input type="range" className="night-range" min={0} max={max} step={AMOUNTS.sleep.step} value={Math.min(n, max)}
          aria-label={W.sleepSlider} aria-valuetext={W.amountValue(amountText(n), unit)}
          onChange={(e) => set(Number(e.target.value), e.currentTarget)} />
      </div>
      <Chips className="m-0">
        {[6, 7, 8, 9].map((v) => (
          <Chip key={v} pressed={n === v} onClick={() => set(v, document.activeElement)}>{W.amountValue(amountText(v), unit)}</Chip>
        ))}
      </Chips>
    </div>
  )
}

// Round − and + at the end of an amount's row, in its step (reading adds with its chips, so it shows only −).
function MoreLess({ h, n, set, more = true }: { h: AmountHabit; n: number; set: (v: number, el?: Element | null) => void; more?: boolean }) {
  const { step } = AMOUNTS[h.type]
  const u = W.amounts[h.type]
  return (
    <span className="amount-end">
      <button type="button" className="icon-btn amount-step" aria-label={u.less} disabled={n <= 0} onClick={() => set(Math.max(0, n - step))}><Minus aria-hidden="true" /></button>
      {more && <button type="button" className="icon-btn amount-step" aria-label={u.more} onClick={(e) => set(n + step, e.currentTarget)}><Plus aria-hidden="true" /></button>}
    </span>
  )
}

// Meditation: a ring filling toward the goal (finished timer sessions fill it too), a session start, and −/+.
function MeditationRing({ h }: { h: AmountHabit }) {
  const { n, target, set } = useAmount(h)
  return (
    <div className="amount-row">
      <Dial size="sm" n={Math.min(n, target)} total={target} value={amountText(n)} />
      <Button variant="outline" asChild><Link to="/timer"><Play aria-hidden="true" />{W.startSession}</Link></Button>
      <MoreLess h={h} n={n} set={set} />
    </div>
  )
}

// Reading: a ring filling toward the goal, quick adds for a session, and −/+.
function ReadingAdds({ h }: { h: AmountHabit }) {
  const { n, target, set } = useAmount(h)
  return (
    <div className="amount-row">
      <Dial size="sm" n={Math.min(n, target)} total={target} value={amountText(n)} />
      <Chips className="m-0">
        {[5, 10, 20].map((v) => (
          <Chip key={v} onClick={() => set(n + v, document.activeElement)}><span aria-label={W.readingAddLabel(v)}>{W.readingAdd(v)}</span></Chip>
        ))}
      </Chips>
      <MoreLess h={h} n={n} set={set} more={false} />
    </div>
  )
}

export function AmountControl({ h }: { h: AmountHabit }) {
  if (h.type === 'sleep') return <SleepBar h={h} />
  if (h.type === 'meditation') return <MeditationRing h={h} />
  return <ReadingAdds h={h} />
}
