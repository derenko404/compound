import type { CSSProperties } from 'react'
import type { Habit } from '@core/domain/types'
import { HABIT_UI } from './habit-ui'

/**
 * A habit's type icon in its colour on the right of its My day row: says what the habit is, and opens its log sheet.
 * A button, so a tap on it never ticks the row.
 */
export function HabitIcon({ habit, label, onOpen }: { habit: Habit; label: string; onOpen: () => void }) {
  const ui = HABIT_UI[habit.type]
  return (
    <button type="button" className="habit-icon" aria-label={label} onClick={onOpen} style={{ '--c': `var(${ui.color})` } as CSSProperties}>
      <ui.icon aria-hidden="true" />
    </button>
  )
}
