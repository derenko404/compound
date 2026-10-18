import { Dialog as DialogPrimitive } from 'radix-ui'
import { t } from '@/shared/i18n'
import { Button } from '../primitives/button'
import { Dialog, DialogContent, DialogDescription } from '../primitives/dialog'

const DialogPrimitiveTitle = DialogPrimitive.Title

/**
 * "Delete X?" with what it removes: a small alert over whatever is open (a form included), Cancel and a red Delete
 * side by side. No header line or close button: Cancel closes it.
 */
export function ConfirmSheet({ open, onOpenChange, title, description, confirm = t.common.delete, onConfirm }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: string; description: string; confirm?: string; onConfirm: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="confirm-sheet" overlayClassName="confirm-overlay">
        <DialogPrimitiveTitle className="confirm-title">{title}</DialogPrimitiveTitle>
        <DialogDescription>{description}</DialogDescription>
        <div className="actions confirm-actions">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t.common.cancel}</Button>
          <Button type="button" variant="destructive" onClick={() => { onConfirm(); onOpenChange(false) }}>{confirm}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
