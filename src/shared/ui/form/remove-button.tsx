import { useState } from 'react'
import { Minus } from 'lucide-react'
import { t } from '@/shared/i18n'
import { ConfirmSheet } from './confirm-sheet'
import type { SheetRemove } from './form-sheet'

/**
 * Deleting a row in edit mode, as on iOS: a red ⊖ in place of its tick (Row check), always confirmed first.
 * Clicks inside stop here, so the row behind doesn't open its form.
 */
export function RemoveButton({ label, title, description, onConfirm }: SheetRemove) {
  const [asking, setAsking] = useState(false)
  return (
    <span className="contents" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
      <button type="button" className="row-remove" aria-label={label} onClick={() => setAsking(true)}><Minus aria-hidden="true" /></button>
      <ConfirmSheet open={asking} onOpenChange={setAsking} title={title} description={description ?? t.common.cantUndo} onConfirm={onConfirm} />
    </span>
  )
}
