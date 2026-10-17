// Date helpers. Day keys are local-time "YYYY-MM-DD" strings.
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

export const fmtLong = (d: Date) => d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
export const fmtShort = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
export const fmtStamp = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
