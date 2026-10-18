// Date helpers. Day keys are local-time "YYYY-MM-DD" strings.
import { currentLocale } from '../i18n/lang'
const pad = (n: number) => String(n).padStart(2, '0')

export const keyOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const parseKey = (k: string) => {
  const [y, m, d] = k.split('-').map(Number)
  return new Date(y, m - 1, d)
}
export const addDays = (d: Date, n: number) => {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}
export const dayDiff = (a: Date, b: Date) =>
  Math.round((parseKey(keyOf(b)).getTime() - parseKey(keyOf(a)).getTime()) / 864e5)

// Starts with a capital: Ukrainian writes weekdays in lowercase, but this opens a heading.
export const fmtLong = (d: Date) => {
  const s = d.toLocaleDateString(currentLocale(), { weekday: 'long', day: 'numeric', month: 'long' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}
export const fmtShort = (d: Date) => d.toLocaleDateString(currentLocale(), { day: 'numeric', month: 'short', year: 'numeric' })
export const fmtStamp = (iso: string) =>
  new Date(iso).toLocaleString(currentLocale(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
