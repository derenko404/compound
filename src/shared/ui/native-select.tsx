import { ChevronDown } from 'lucide-react'

export interface NativeOption { value: string; label: string }
export interface NativeGroup { label?: string; options: NativeOption[] }

// The system's own picker, styled as our field: touch devices get it instead of our dropdown (SettingSelect, SelectField, TopicSelect).
export function NativeSelect({ id, label, value, onChange, groups, className }: {
  id?: string; label?: string; value: string; onChange: (v: string) => void; groups: NativeGroup[]; className?: string
}) {
  const option = (o: NativeOption) => <option key={o.value} value={o.value}>{o.label}</option>
  return (
    <span className={`native-select${className ? ` ${className}` : ''}`}>
      <select id={id} aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}>
        {groups.map((g) => (g.label ? <optgroup key={g.label} label={g.label}>{g.options.map(option)}</optgroup> : g.options.map(option)))}
      </select>
      <ChevronDown aria-hidden="true" />
    </span>
  )
}
