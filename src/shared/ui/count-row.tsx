import type { ComponentType } from 'react'
import { burst } from '@/shared/lib/celebrate'
import { playTick, playUntick } from '@/shared/lib/sound'
import { t } from '@/shared/i18n'
import { Stepper } from './stepper'
import { clx } from '@/shared/lib/clx'

/**
 * A count toward a daily goal (glasses of water): one icon per unit, filled up to n. Tap one to set the count to it,
 * tap the last filled one to take it back. Past the goal a dashed one more is offered. Goals above 10 get a stepper.
 * unit: singular and plural for English-style labels ("glass", "glasses"), or a CountUnit with the labels in full
 * (languages whose plurals and cases a pair of words can't cover).
 */
export interface CountUnit { of: (n: number, total: number) => string; count: (n: number) => string; add: string; remove: string }
export function CountRow({ n, target, onSet, icon: Icon, unit: u }: {
  n: number; target: number; onSet: (n: number) => void; icon: ComponentType<{ 'aria-hidden'?: boolean }>; unit: [string, string] | CountUnit
}) {
  const k = t.nav.kit
  const unit: CountUnit = Array.isArray(u)
    ? { of: (a, b) => k.of(a, b, u[1]), count: (i) => k.unitN(i, i === 1 ? u[0] : u[1]), add: k.addUnit(u[0]), remove: k.removeUnit(u[0]) }
    : u
  const set = (v: number, el: HTMLElement) => {
    if (v > n) {
      playTick(Math.min(1, v / target))
      burst(el, 20)
    } else playUntick()
    onSet(v)
  }
  if (target > 10) return (
    <Stepper label={unit.of(n, target)} value={`${n}/${target}`} less={unit.remove} more={unit.add}
      onLess={n ? (el) => set(n - 1, el) : undefined} onMore={(el) => set(n + 1, el)} />
  )
  const shown = Math.max(target, n) + (n >= target ? 1 : 0)
  return (
    <div className="count-row" role="group" aria-label={unit.of(n, target)}>
      {Array.from({ length: shown }, (_, i) => (
        <button key={i} type="button" className={clx('count-unit', i < n && 'on', i >= target && 'extra')}
          aria-label={unit.count(i + 1)} aria-pressed={i < n} onClick={(e) => set(i + 1 === n ? i : i + 1, e.currentTarget)}>
          <Icon aria-hidden />
        </button>
      ))}
    </div>
  )
}
