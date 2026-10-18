import * as React from "react"
import { XIcon } from "lucide-react"
import { Dialog as DialogPrimitive } from "radix-ui"
import { cn } from "@/lib/utils"
import { t } from "@/i18n"

function Dialog(props: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger(props: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogClose(props: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

// Centered on wide screens, a bottom sheet on phones. overlayClassName: for a dialog opened over another one,
// so its backdrop covers the first.
function DialogContent({ className, overlayClassName, children, ...props }: React.ComponentProps<typeof DialogPrimitive.Content> & { overlayClassName?: string }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay data-slot="dialog-overlay" className={cn("sheet-overlay fixed inset-0 bg-black/45", overlayClassName)} />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          "sheet fixed grid w-full gap-4 overflow-y-auto border border-border bg-card p-5 text-card-foreground shadow-lg outline-none",
          className
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

// The title and the close button share one row, so they stay aligned whatever sits above them.
// Forms pass `start` (Cancel) and `end` (the main action): on phones they replace the close button,
// iOS-style, with the title centred between them.
function DialogTitle({ className, start, end, ...props }: React.ComponentProps<typeof DialogPrimitive.Title> & { start?: React.ReactNode; end?: React.ReactNode }) {
  return (
    <div className={cn("sheet-head", (start || end) && "has-actions")}>
      {start && <div className="sheet-start">{start}</div>}
      <DialogPrimitive.Title data-slot="dialog-title" className={cn("font-display text-heading font-bold", className)} {...props} />
      {end && <div className="sheet-end">{end}</div>}
      <DialogPrimitive.Close className="icon-btn sheet-close" aria-label={t.common.close}>
        <XIcon />
      </DialogPrimitive.Close>
    </div>
  )
}

function DialogDescription({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description data-slot="dialog-description" className={cn("text-small text-muted-foreground", className)} {...props} />
}

export { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger }
