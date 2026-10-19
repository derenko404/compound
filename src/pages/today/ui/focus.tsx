// This week on Today, as a strip of days.
import { dates } from '@/shared/lib/dates'
import { dayProgress, weekdayShort } from '@/features/today'
import { t } from '@/shared/i18n'
import { useStore } from '@/shared/store/StoreProvider'

const weekDays = (today: Date) => {
  const monday = dates.addDays(today, -((today.getDay() + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => dates.addDays(monday, i))
}

// This week, Monday to Sunday: how much of each day got done, as a ring and as done/total.
export function WeekStrip() {
  const { state } = useStore()
  const today = new Date()
  const k = dates.keyOf(today)
  const days = weekDays(today)
  return (
    <div className="week-strip">
      {days.map((d) => {
        const dk = dates.keyOf(d)
        const { done, total } = dayProgress(state, d)
        const pct = total ? done / total : 0
        const state_ = dk > k ? 'future' : pct === 1 ? 'full' : pct > 0 ? 'part' : 'empty'
        return (
          <div key={dk} className={`wday${dk === k ? ' today' : ''}`} data-state={state_}>
            <span>{weekdayShort(d.getDay())}</span>
            <i style={{ '--pct': `${pct * 100}%` } as React.CSSProperties} aria-label={dk > k ? t.today.week.upcoming : t.today.week.doneOf(done, total)} />
            <small aria-hidden="true">{total ? `${done}/${total}` : '–'}</small>
          </div>
        )
      })}
    </div>
  )
}
