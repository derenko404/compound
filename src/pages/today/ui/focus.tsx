// This week on Today, as a strip of days.
import { dates } from '@/shared/lib/dates'
import { dayProgress, weekdayShort } from '@/features/today'
import { t } from '@/shared/i18n'
import { useStore } from '@/shared/store/StoreProvider'
import { WeekStrip } from '@/shared/ui'

const weekDays = (today: Date) => {
  const monday = dates.addDays(today, -((today.getDay() + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => dates.addDays(monday, i))
}

// This week, Monday to Sunday: how much of each day got done, as a ring and as done/total.
export function TodayWeek() {
  const { state } = useStore()
  const today = new Date()
  const k = dates.keyOf(today)
  return (
    <WeekStrip days={weekDays(today).map((d) => {
      const dk = dates.keyOf(d)
      const { done, total } = dayProgress(state, d)
      const pct = total ? done / total : 0
      return {
        key: dk, label: weekdayShort(d.getDay()), pct, today: dk === k,
        state: dk > k ? 'future' : pct === 1 ? 'full' : pct > 0 ? 'part' : 'empty',
        aria: dk > k ? t.today.week.upcoming : t.today.week.doneOf(done, total),
        value: total ? `${done}/${total}` : '–',
      }
    })} />
  )
}
