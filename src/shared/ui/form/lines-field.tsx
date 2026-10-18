import { useId, useLayoutEffect, useRef, useState } from 'react'
import { CornerDownLeft, X } from 'lucide-react'
import { t } from '@/shared/i18n'
import { Label } from '../primitives/label'
import { Textarea } from '../primitives/textarea'
import { Chip, Chips } from '../chip'
import { cleanLines } from '../lib/lines'

/**
 * One item per line. Used for outcomes, tips, skills, steps and checklist items.
 * A list of short texts (outcomes, tips, steps, checklist items): type one, press Enter or ↵, and it drops below as its
 * own entry. Tap an entry to edit it again, × to remove it. Pasting several lines adds each as an entry.
 * quick: common entries offered as one-tap chips under the field until added. Nothing is added by default.
 */
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
        <button type="button" className="lines-add" aria-label={t.nav.edit.addTo(label)} disabled={!draft.trim()}
          onMouseDown={(e) => e.preventDefault()} onClick={() => add(draft)}><CornerDownLeft /></button>
      </div>
      {hint && <span className="text-caption text-muted-foreground">{hint}</span>}
      {items.length > 0 && (
        <ul className="entries">
          {items.map((it, i) => (
            <li key={i} className="entry">
              <button type="button" className="entry-text" title={t.common.edit} onClick={() => { onChange(items.filter((_, j) => j !== i)); setDraft(it) }}>{it}</button>
              <button type="button" className="icon-btn" aria-label={t.nav.edit.remove(it)} onClick={() => onChange(items.filter((_, j) => j !== i))}><X /></button>
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
