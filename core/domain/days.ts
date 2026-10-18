// Day keys: local-time "YYYY-MM-DD" strings. The app's dates helper (src/shared/lib/dates.ts) builds on these.
const pad = (n: number) => String(n).padStart(2, '0')

const keyOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const parseKey = (k: string) => {
  const [y, m, d] = k.split('-').map(Number)
  return new Date(y, m - 1, d)
}
const addDays = (d: Date, n: number) => {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}
const dayDiff = (a: Date, b: Date) =>
  Math.round((parseKey(keyOf(b)).getTime() - parseKey(keyOf(a)).getTime()) / 864e5)

export const days = { keyOf, parseKey, addDays, dayDiff }
