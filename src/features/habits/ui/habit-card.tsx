import { useState, type CSSProperties } from 'react'
import { ChevronDown } from 'lucide-react'
import { IconBadge } from '@/shared/ui'
import { dayDiff, fmtShort, parseKey } from '@/shared/lib/dates'
import type { Habit, HabitType } from '@core/domain/types'
import { useStore } from '@/shared/store/StoreProvider'
import { t } from '@/shared/i18n'
import { started } from '../model/habits'
import { HABIT_UI } from './habit-ui'
import { skinOf } from './habit-skin'

const W = t.wellbeing

const tone = (token: string) => ({ '--c': `var(${token})` }) as CSSProperties

export const START_LABEL: Record<HabitType, string> = W.start

/**
 * A short card: icon, name, the main number and today's action. Tap it for the details.
 * Wide screens (above the compact breakpoint) have room for the details, so cards start open there.
 */
const wide = () => typeof window !== 'undefined' && window.matchMedia('(min-width: 721px)').matches

export function HabitCard({ h }: { h: Habit }) {
  const { state } = useStore()
  const [open, setOpen] = useState(wide)
  const today = new Date()
  const ui = HABIT_UI[h.type]
  const on = started(h, today)
  const skin = on ? skinOf(state, h, today) : null
  const waiting = h.start_date
    ? W.waiting(START_LABEL[h.type], fmtShort(parseKey(h.start_date)), dayDiff(today, parseKey(h.start_date)))
    : W.notStarted
  return (
    <div className="hcard" style={tone(ui.color)}>
      <div className="hcard-head">
        <button type="button" className="hcard-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
          <IconBadge icon={ui.icon} label={ui.label} color={ui.color} />
          <span className="hcard-text">
            <span className="hcard-name">{h.name}<ChevronDown className={open ? 'rotate-180' : undefined} aria-hidden="true" /></span>
          </span>
        </button>
        {/* The count: on the right of the header, or under the name on wide screens with a done button. */}
        <span className="hcard-value">{skin ? skin.value : waiting}</span>
      </div>
      {skin?.line && <div className="hcard-line">{skin.line}</div>}
      {skin?.done}
      {open && (
        <div className="hcard-body">
          {h.why && <div className="widget-sub">{h.why}</div>}
          {skin?.details}
          {skin?.actions && <div className="hcard-foot">{skin.actions}</div>}
        </div>
      )}
    </div>
  )
}
