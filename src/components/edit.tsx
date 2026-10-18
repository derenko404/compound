// Building blocks for editing content: form sheets, fields, pickers and row controls.
import { useId, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { PALETTE, WEEKDAYS_SHORT, chapters, monthLabel, uid } from '@/lib/content'
import { startDate } from '@/lib/derive'
import type { ChapterId, State } from '@/lib/types'
import { useStore } from '@/store/StoreProvider'
import { toast } from '@/fx/fx'
import { Chip, Chips, ConfirmButton, Dot } from './kit'

/* ---------- Sheet with a form ---------- */

export function FormSheet({ open, onOpenChange, title, description, children, onSubmit, submit = 'Save', onDelete, wide }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: ReactNode
  onSubmit: () => boolean | void // return false to keep the sheet open
  submit?: string
  onDelete?: () => void
  wide?: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={wide ? 'sheet-wide' : undefined}>
        <DialogTitle>{title}</DialogTitle>
        {description ? <DialogDescription>{description}</DialogDescription> : <DialogDescription className="sr-only">{title}</DialogDescription>}
        <form
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (onSubmit() !== false) onOpenChange(false)
          }}
        >
          {children}
          <div className="actions sticky bottom-0 -mx-5 -mb-5 border-t border-border bg-card px-5 py-3">
            <Button type="submit">{submit}</Button>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            {onDelete && <ConfirmButton label="Delete" armed="Tap again to delete" onConfirm={() => { onDelete(); onOpenChange(false) }} />}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Shows why a form can't be saved and keeps its sheet open.
export const fail = (msg: string) => {
  toast(msg)
  return false as const
}

// Open state for a sheet that edits one value at a time (null = closed).
export function useSheet<T>() {
  const [value, setValue] = useState<T | null>(null)
  return { value, open: (v: T) => setValue(v), close: () => setValue(null), props: { open: value !== null, onOpenChange: (o: boolean) => !o && setValue(null) } }
}

/* ---------- Fields ---------- */

export function Field({ label, hint, children, full }: { label: string; hint?: string; children: (id: string) => ReactNode; full?: boolean }) {
  const id = useId()
  return (
    <div className={full ? 'field span-all' : 'field'}>
      <Label htmlFor={id}>{label}</Label>
      {children(id)}
      {hint && <span className="text-caption text-muted-foreground">{hint}</span>}
    </div>
  )
}

export const TextField = ({ label, value, onChange, placeholder, hint, type, required, full }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; hint?: string; type?: string; required?: boolean; full?: boolean
}) => (
  <Field label={label} hint={hint} full={full}>
    {(id) => <Input id={id} type={type} value={value} required={required} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />}
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

// One item per line. Used for outcomes, tips, skills, steps and checklist items.
export const LinesField = ({ label, value, onChange, hint, rows = 5 }: { label: string; value: string[]; onChange: (v: string[]) => void; hint?: string; rows?: number }) => (
  <AreaField label={label} hint={hint ?? 'One per line'} rows={rows} value={value.join('\n')} onChange={(v) => onChange(v.split('\n'))} />
)
export const cleanLines = (xs: string[]) => xs.map((x) => x.trim()).filter(Boolean)

// Keeps ids of lines that didn't change (or were edited in place), so progress on them survives an edit.
export function linesToItems(lines: string[], old: { id: string; text: string }[]) {
  const texts = cleanLines(lines)
  const used = new Set<string>()
  const exact = texts.map((t) => {
    const o = old.find((x) => x.text === t && !used.has(x.id))
    if (o) used.add(o.id)
    return o?.id
  })
  return texts.map((text, i) => {
    let id = exact[i]
    if (!id && old[i] && !used.has(old[i].id) && !texts.includes(old[i].text)) {
      id = old[i].id
      used.add(id)
    }
    return { id: id ?? uid(), text }
  })
}

export function ChapterSelect({ id, value, onChange, state, allowNone }: {
  id?: string; value: ChapterId | null; onChange: (c: ChapterId | null) => void; state: State; allowNone?: string
}) {
  return (
    <Select value={value ?? 'none'} onValueChange={(v) => onChange(v === 'none' ? null : v)}>
      <SelectTrigger id={id} className="w-full"><SelectValue /></SelectTrigger>
      <SelectContent>
        {allowNone && <SelectItem value="none">{allowNone}</SelectItem>}
        {chapters(state).map((c) => (
          <SelectItem key={c.id} value={c.id}><Dot ch={c.id} />{c.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export const ChapterField = ({ label = 'Chapter', value, onChange, allowNone }: { label?: string; value: ChapterId | null; onChange: (c: ChapterId | null) => void; allowNone?: string }) => {
  const { state } = useStore()
  return <Field label={label}>{(id) => <ChapterSelect id={id} state={state} value={value} onChange={onChange} allowNone={allowNone} />}</Field>
}

export function ColorField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="field span-all">
      <Label>Colour</Label>
      <div className="swatches" role="radiogroup" aria-label="Colour">
        {PALETTE.map((p) => (
          <button key={p} type="button" role="radio" aria-checked={value === p} aria-label={p} className="swatch" style={{ '--c': `var(--p-${p})` } as React.CSSProperties} onClick={() => onChange(p)} />
        ))}
      </div>
    </div>
  )
}

export function WeekdaysField({ value, onChange }: { value: number[]; onChange: (v: number[]) => void }) {
  // Monday first.
  const order = [1, 2, 3, 4, 5, 6, 0]
  return (
    <div className="field span-all">
      <Label>Days</Label>
      <Chips className="m-0">
        {order.map((d) => (
          <Chip key={d} pressed={value.includes(d)} onClick={() => onChange(value.includes(d) ? value.filter((x) => x !== d) : [...value, d].sort())}>
            {WEEKDAYS_SHORT[d]}
          </Chip>
        ))}
      </Chips>
    </div>
  )
}

// Program month picker: "Month 3 · Jan".
export function MonthField({ label, value, onChange, months }: { label: string; value: number; onChange: (v: number) => void; months: number }) {
  const { state } = useStore()
  const start = startDate(state)
  return (
    <SelectField label={label} value={String(value)} onChange={(v) => onChange(Number(v))}
      options={Array.from({ length: months }, (_, m) => ({ value: String(m), label: `Month ${m + 1} · ${monthLabel(start, m)}` }))} />
  )
}

/* ---------- Edit controls on rows ---------- */

export function RowEdit({ onEdit, onUp, onDown, onDelete, label }: { onEdit?: () => void; onUp?: () => void; onDown?: () => void; onDelete?: () => void; label: string }) {
  const [arm, setArm] = useState(false)
  return (
    <div className="row-edit">
      {onUp && <button type="button" className="icon-btn" aria-label={`Move ${label} up`} onClick={onUp}><ArrowUp /></button>}
      {onDown && <button type="button" className="icon-btn" aria-label={`Move ${label} down`} onClick={onDown}><ArrowDown /></button>}
      {onEdit && <button type="button" className="icon-btn" aria-label={`Edit ${label}`} onClick={onEdit}><Pencil /></button>}
      {onDelete && (
        <button type="button" className={`icon-btn${arm ? ' danger' : ''}`} aria-label={arm ? `Tap again to delete ${label}` : `Delete ${label}`}
          onClick={() => { if (arm) onDelete(); else { setArm(true); setTimeout(() => setArm(false), 3000) } }}>
          <Trash2 />
        </button>
      )}
    </div>
  )
}

export function AddButton({ label, onClick, variant = 'outline' }: { label: string; onClick: () => void; variant?: 'outline' | 'default' }) {
  return <Button type="button" variant={variant} size="sm" onClick={onClick}><Plus />{label}</Button>
}

// Round "+" next to a section or page title.
export function PlusButton({ label, onClick }: { label: string; onClick: () => void }) {
  return <button type="button" className="plus-btn" aria-label={label} title={label} onClick={onClick}><Plus /></button>
}

export function EditToggle({ on, onChange }: { on: boolean; onChange: (on: boolean) => void }) {
  return (
    <Button type="button" variant={on ? 'default' : 'outline'} size="sm" onClick={() => onChange(!on)}>
      {on ? 'Done' : <><Pencil />Edit</>}
    </Button>
  )
}

export const move = <T,>(xs: T[], i: number, d: -1 | 1) => {
  const j = i + d
  if (j < 0 || j >= xs.length) return xs
  const ys = [...xs]
  ;[ys[i], ys[j]] = [ys[j], ys[i]]
  return ys
}
