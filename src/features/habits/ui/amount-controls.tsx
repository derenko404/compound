// Each amount tracker's own control, on its card and in its log sheet: sleep's chips, meditation's start, reading's adds.
import { Link } from '@tanstack/react-router'
import { Minus, Play, Plus } from 'lucide-react'
import { Button } from '@/shared/ui/primitives/button'
import { Chip, Chips } from '@/shared/ui'
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

// Sleep: chips for the usual nights in one tap, and −/+ by half an hour.
function SleepAdds({ h }: { h: AmountHabit }) {
  const { n, set } = useAmount(h)
  const unit = W.amounts.sleep.unit
  return (
    <div className="amount-row">
      <Chips className="m-0">
        {[6, 7, 8, 9].map((v) => (
          <Chip key={v} pressed={n === v} onClick={() => set(v, document.activeElement)}>{W.amountValue(amountText(v), unit)}</Chip>
        ))}
      </Chips>
      <MoreLess h={h} n={n} set={set} />
    </div>
  )
}

// Round − and + at the end of an amount's row, in its step.
function MoreLess({ h, n, set }: { h: AmountHabit; n: number; set: (v: number, el?: Element | null) => void }) {
  const { step } = AMOUNTS[h.type]
  const u = W.amounts[h.type]
  return (
    <span className="amount-end">
      <button type="button" className="icon-btn amount-step" aria-label={u.less} disabled={n <= 0} onClick={() => set(Math.max(0, n - step))}><Minus aria-hidden="true" /></button>
      <button type="button" className="icon-btn amount-step" aria-label={u.more} onClick={(e) => set(n + step, e.currentTarget)}><Plus aria-hidden="true" /></button>
    </span>
  )
}

// Meditation: a session start (finished timer sessions add their minutes), and −/+.
function MeditationAdds({ h }: { h: AmountHabit }) {
  const { n, set } = useAmount(h)
  return (
    <div className="amount-row">
      <Button variant="outline" asChild><Link to="/timer"><Play aria-hidden="true" />{W.startSession}</Link></Button>
      <MoreLess h={h} n={n} set={set} />
    </div>
  )
}

// Reading: quick adds for a session, and −/+.
function ReadingAdds({ h }: { h: AmountHabit }) {
  const { n, set } = useAmount(h)
  return (
    <div className="amount-row">
      <Chips className="m-0">
        {[5, 10, 20].map((v) => (
          <Chip key={v} onClick={() => set(n + v, document.activeElement)}><span aria-label={W.readingAddLabel(v)}>{W.readingAdd(v)}</span></Chip>
        ))}
      </Chips>
      <MoreLess h={h} n={n} set={set} />
    </div>
  )
}

export function AmountControl({ h }: { h: AmountHabit }) {
  if (h.type === 'sleep') return <SleepAdds h={h} />
  if (h.type === 'meditation') return <MeditationAdds h={h} />
  return <ReadingAdds h={h} />
}
