// Building blocks for editing content: form sheets, fields, pickers and row controls.
import { useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { CornerDownLeft, Minus, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Dialog as DialogPrimitive } from 'radix-ui'

const DialogPrimitiveTitle = DialogPrimitive.Title
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { PALETTE, WEEKDAYS_SHORT, topics, uid } from '@/lib/content'
import type { TopicId, State } from '@/lib/types'
import { useStore } from '@/store/StoreProvider'
import { toast } from '@/fx/fx'
import { Chip, Chips, Dot } from './kit'

/* ---------- Sheet with a form ---------- */

// "Delete X?" with what it removes: a small alert over whatever is open (a form included), Cancel and a red Delete
// side by side. No header line or close button: Cancel closes it.
export function ConfirmSheet({ open, onOpenChange, title, description, confirm = 'Delete', onConfirm }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: string; description: string; confirm?: string; onConfirm: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="confirm-sheet" overlayClassName="confirm-overlay">
        <DialogPrimitiveTitle className="confirm-title">{title}</DialogPrimitiveTitle>
        <DialogDescription>{description}</DialogDescription>
        <div className="actions confirm-actions">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" variant="destructive" onClick={() => { onConfirm(); onOpenChange(false) }}>{confirm}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// remove: deleting the thing being edited, always confirmed in a dialog. label names what goes ("Delete task"); title
// asks ("Delete Weekly review?"). Desktop: the footer's far left, away from Cancel and Save. Phones (no footer): the
// form's last row, full width.
export interface SheetRemove { label: string; title: string; description?: string; onConfirm: () => void }

// Deleting a row in edit mode, as on iOS: a red ⊖ in place of its tick (Row check), always confirmed first.
// Clicks inside stop here, so the row behind doesn't open its form.
export function RemoveButton({ label, title, description, onConfirm }: SheetRemove) {
  const [asking, setAsking] = useState(false)
  return (
    <span className="contents" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
      <button type="button" className="row-remove" aria-label={label} onClick={() => setAsking(true)}><Minus aria-hidden="true" /></button>
      <ConfirmSheet open={asking} onOpenChange={setAsking} title={title} description={description ?? "This can't be undone."} onConfirm={onConfirm} />
    </span>
  )
}

export function FormSheet({ open, onOpenChange, title, description, children, onSubmit, submit = 'Save', remove, wide }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: ReactNode
  onSubmit: () => boolean | void // return false to keep the sheet open
  submit?: string
  remove?: SheetRemove
  wide?: boolean
}) {
  const formId = useId()
  const [asking, setAsking] = useState(false)
  const cancel = <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={wide ? 'sheet-wide' : undefined}>
        {/* Phones: Cancel and the action sit in the header, as iOS and Android sheets do. Desktop: in the footer. */}
        <DialogTitle start={cancel} end={<Button type="submit" form={formId} variant="ghost" className="sheet-action">{submit}</Button>}>{title}</DialogTitle>
        {description ? <DialogDescription>{description}</DialogDescription> : <DialogDescription className="sr-only">{title}</DialogDescription>}
        <form
          id={formId}
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (onSubmit() !== false) onOpenChange(false)
          }}
        >
          {children}
          {remove && <Button type="button" variant="outline" className="sheet-delete sheet-delete-row" onClick={() => setAsking(true)}>{remove.label}</Button>}
          <div className="actions sheet-foot">
            {remove && <Button type="button" variant="outline" className="sheet-delete" onClick={() => setAsking(true)}>{remove.label}</Button>}
            {cancel}
            <Button type="submit">{submit}</Button>
          </div>
        </form>
        {remove && (
          <ConfirmSheet open={asking} onOpenChange={setAsking} title={remove.title} description={remove.description ?? "This can't be undone."}
            onConfirm={() => { remove.onConfirm(); onOpenChange(false) }} />
        )}
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
// A list of short texts (outcomes, tips, steps, checklist items): type one, press Enter or ↵, and it drops below as its
// own entry. Tap an entry to edit it again, × to remove it. Pasting several lines adds each as an entry.
// quick: common entries offered as one-tap chips under the field until added. Nothing is added by default.
export function LinesField({ label, value, onChange, hint, placeholder, quick }: {
  label: string; value: string[]; onChange: (v: string[]) => void; hint?: string; placeholder?: string; rows?: number; quick?: string[]
}) {
  const id = useId()
  const [draft, setDraft] = useState('')
  const items = value.filter((x) => x.trim())
  const offer = (quick ?? []).filter((x) => !items.includes(x))
  // The box grows with a long entry and shrinks back once it's added.
  const box = useRef<HTMLTextAreaElement | null>(null)
  const grow = (el: HTMLTextAreaElement | null) => { box.current = el }
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [draft])
  const add = (text: string) => {
    const more = cleanLines(text.split('\n'))
    if (more.length) onChange([...items, ...more])
    setDraft('')
  }
  return (
    <div className="field span-all">
      <Label htmlFor={id}>{label}</Label>
      {/* The ↵ button inside the box shows how an entry is added: tap it or press Enter. */}
      <div className="lines-input">
        <Textarea id={id} rows={1} value={draft} placeholder={placeholder} className="min-h-0" ref={grow}
          onChange={(e) => (e.target.value.includes('\n') ? add(e.target.value) : setDraft(e.target.value))}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); add(draft) } }}
          onBlur={() => draft.trim() && add(draft)} />
        <button type="button" className="lines-add" aria-label={`Add to ${label}`} disabled={!draft.trim()}
          onMouseDown={(e) => e.preventDefault()} onClick={() => add(draft)}><CornerDownLeft /></button>
      </div>
      {hint && <span className="text-caption text-muted-foreground">{hint}</span>}
      {items.length > 0 && (
        <ul className="entries">
          {items.map((it, i) => (
            <li key={i} className="entry">
              <button type="button" className="entry-text" title="Edit" onClick={() => { onChange(items.filter((_, j) => j !== i)); setDraft(it) }}>{it}</button>
              <button type="button" className="icon-btn" aria-label={`Remove ${it}`} onClick={() => onChange(items.filter((_, j) => j !== i))}><X /></button>
            </li>
          ))}
        </ul>
      )}
      {offer.length > 0 && (
        <Chips className="m-0">{offer.map((x) => <Chip key={x} onClick={() => onChange([...items, x])}>+ {x}</Chip>)}</Chips>
      )}
    </div>
  )
}
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

// Personal (and other general topics) first, then the roadmap topics, then wellbeing habits.
export function TopicSelect({ id, value, onChange, state, allowNone }: {
  id?: string; value: TopicId | null; onChange: (c: TopicId | null) => void; state: State; allowNone?: string
}) {
  const groups = [
    { label: '', items: topics(state, 'general') },
    { label: 'Topics', items: topics(state, 'learn') },
  ].filter((g) => g.items.length)
  return (
    <Select value={value ?? 'none'} onValueChange={(v) => onChange(v === 'none' ? null : v)}>
      <SelectTrigger id={id} className="w-full"><SelectValue /></SelectTrigger>
      <SelectContent>
        {allowNone && <SelectItem value="none">{allowNone}</SelectItem>}
        {groups.map((g, i) => (
          <SelectGroup key={g.label || 'general'}>
            {(i > 0 || allowNone) && <SelectSeparator />}
            {g.label && <SelectLabel>{g.label}</SelectLabel>}
            {g.items.map((c) => <SelectItem key={c.id} value={c.id}><Dot ch={c.id} />{c.name}</SelectItem>)}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  )
}

export const TopicField = ({ label = 'Topic', value, onChange, allowNone }: { label?: string; value: TopicId | null; onChange: (c: TopicId | null) => void; allowNone?: string }) => {
  const { state } = useStore()
  return <Field label={label}>{(id) => <TopicSelect id={id} state={state} value={value} onChange={onChange} allowNone={allowNone} />}</Field>
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

// The days of the week as one row of seven equal buttons, Monday first. Never wraps.
export function WeekdaysField({ value, onChange }: { value: number[]; onChange: (v: number[]) => void }) {
  const order = [1, 2, 3, 4, 5, 6, 0]
  return (
    <div className="field span-all">
      <Label>Days</Label>
      <div className="segmented" role="group" aria-label="Days" style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
        {order.map((d) => (
          <button key={d} type="button" className="segment" aria-pressed={value.includes(d)}
            onClick={() => onChange(value.includes(d) ? value.filter((x) => x !== d) : [...value, d].sort())}>
            {WEEKDAYS_SHORT[d]}
          </button>
        ))}
      </div>
    </div>
  )
}

export function AddButton({ label, onClick, variant = 'outline' }: { label: string; onClick: () => void; variant?: 'outline' | 'default' }) {
  return <Button type="button" variant={variant} onClick={onClick}><Plus />{label}</Button>
}

// Round "+" next to a section or page title.
export function PlusButton({ label, onClick }: { label: string; onClick: () => void }) {
  return <button type="button" className="plus-btn" aria-label={label} title={label} onClick={onClick}><Plus /></button>
}

// The page's main add action, floating bottom right (above the bottom nav on phones).
export function Fab({ label, onClick }: { label: string; onClick: () => void }) {
  return <button type="button" className="fab" aria-label={label} title={label} onClick={onClick}><Plus /></button>
}

export const moveTo = <T,>(xs: T[], from: number, to: number) => {
  const ys = [...xs]
  ys.splice(to, 0, ...ys.splice(from, 1))
  return ys
}
