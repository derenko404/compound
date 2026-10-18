import { useId, useState, type ReactNode } from 'react'
import { t } from '@/shared/i18n'
import { Button } from '../primitives/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../primitives/dialog'
import { ConfirmSheet } from './confirm-sheet'

/**
 * remove: deleting the thing being edited, always confirmed in a dialog. label names what goes ("Delete task"); title
 * asks ("Delete Weekly review?"). Desktop: the footer's far left, away from Cancel and Save. Phones (no footer): the
 * form's last row, full width.
 */
export interface SheetRemove { label: string; title: string; description?: string; onConfirm: () => void }

export function FormSheet({ open, onOpenChange, title, description, children, onSubmit, submit = t.common.save, remove, wide }: {
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
  const cancel = <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>{t.common.cancel}</Button>
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
          <ConfirmSheet open={asking} onOpenChange={setAsking} title={remove.title} description={remove.description ?? t.common.cantUndo}
            onConfirm={() => { remove.onConfirm(); onOpenChange(false) }} />
        )}
      </DialogContent>
    </Dialog>
  )
}
