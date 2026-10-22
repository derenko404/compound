import type { ReactNode } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './primitives/select'
import { NativeSelect } from './native-select'
import { useTouch } from './lib/use-touch'

// A dropdown on the right of a SettingRow (theme, language): one choice of a few whose labels are too long for Segmented.
export function SettingSelect<T extends string>({ label, value, onChange, options }: {
  label: string; value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[]
}) {
  const touch = useTouch()
  if (touch && options.every((o) => typeof o.label === 'string'))
    return <NativeSelect label={label} value={value} onChange={(v) => onChange(v as T)} groups={[{ options: options as { value: T; label: string }[] }]} />
  return (
    <Select value={value} onValueChange={(v) => onChange(v as T)}>
      <SelectTrigger aria-label={label}><SelectValue /></SelectTrigger>
      <SelectContent>{options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
    </Select>
  )
}
