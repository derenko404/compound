// Date helpers. Day keys are local-time "YYYY-MM-DD" strings.
import { days } from '@core/domain/days'
import { currentLocale } from '@/shared/i18n/lang'
const { keyOf, parseKey, addDays, dayDiff } = days

// Starts with a capital: Ukrainian writes weekdays in lowercase, but this opens a heading.
const fmtLong = (d: Date) => {
  const s = d.toLocaleDateString(currentLocale(), { weekday: 'long', day: 'numeric', month: 'long' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}
const fmtShort = (d: Date) => d.toLocaleDateString(currentLocale(), { day: 'numeric', month: 'short', year: 'numeric' })
const fmtStamp = (iso: string) =>
  new Date(iso).toLocaleString(currentLocale(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

export const dates = { keyOf, parseKey, addDays, dayDiff, fmtLong, fmtShort, fmtStamp }
