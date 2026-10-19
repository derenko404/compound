import { useId, type ReactNode } from 'react'
import { Input } from '../primitives/input'
import { Label } from '../primitives/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../primitives/select'
import { Switch } from '../primitives/switch'
import { Textarea } from '../primitives/textarea'

// hideLabel: the label is only for screen readers, when the placeholder already says what goes in.
export function Field({ label, hint, children, full, hideLabel }: { label: string; hint?: string; children: (id: string) => ReactNode; full?: boolean; hideLabel?: boolean }) {
  const id = useId()
  return (
    <div className={full ? 'field span-all' : 'field'}>
      <Label htmlFor={id} className={hideLabel ? 'sr-only' : undefined}>{label}</Label>
      {children(id)}
      {hint && <span className="text-caption text-muted-foreground">{hint}</span>}
    </div>
  )
}

/**
 * autoFocus: FormSheet focuses this field when it opens. onEnter: Return runs it instead of submitting the form
 * (quick add, where Return adds one more and keeps the sheet open).
 */
export const TextField = ({ label, value, onChange, placeholder, hint, type, required, full, hideLabel, autoFocus, onEnter }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; hint?: string; type?: string; required?: boolean; full?: boolean
  hideLabel?: boolean; autoFocus?: boolean; onEnter?: () => void
}) => (
  <Field label={label} hint={hint} full={full} hideLabel={hideLabel}>
    {(id) => (
      <Input id={id} type={type} value={value} required={required} placeholder={placeholder} onChange={(e) => onChange(e.target.value)}
        data-autofocus={autoFocus || undefined} enterKeyHint={onEnter ? 'enter' : undefined}
        onKeyDown={onEnter && ((e) => {
          if (e.key !== 'Enter' || e.nativeEvent.isComposing) return
          e.preventDefault()
          onEnter()
        })} />
    )}
  </Field>
)

export const AreaField = ({ label, value, onChange, placeholder, hint, rows }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; hint?: string; rows?: number
}) => (
  <Field label={label} hint={hint} full>
    {(id) => <Textarea id={id} rows={rows} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />}
  </Field>
)

export function SelectField<T extends string>({ label, value, onChange, options, hint }: {
  label: string; value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[]; hint?: string
}) {
  return (
    <Field label={label} hint={hint}>
      {(id) => (
        <Select value={value} onValueChange={(v) => onChange(v as T)}>
          <SelectTrigger id={id} className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>{options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
        </Select>
      )}
    </Field>
  )
}

export const SwitchField = ({ label, sub, checked, onChange }: { label: string; sub?: string; checked: boolean; onChange: (v: boolean) => void }) => (
  <label className="span-all flex items-center justify-between gap-4 py-1">
    <span className="min-w-0"><span className="font-bold">{label}</span>{sub && <span className="block text-small text-muted-foreground">{sub}</span>}</span>
    <Switch checked={checked} onCheckedChange={onChange} />
  </label>
)
