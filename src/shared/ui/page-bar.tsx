import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { ChevronLeft, MoreHorizontal, type LucideIcon } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './primitives/dropdown-menu'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './primitives/dialog'
import { PlusButton } from './plus-button'
import { t } from '@/shared/i18n'
import { clx } from '@/shared/lib/clx'

export interface BarAction { label: string; icon?: LucideIcon; onSelect: () => void; danger?: boolean }

/**
 * What a page puts in the top bar: a back link (inner pages), `link` for an icon that opens a related page (Wellbeing's
 * timer), `add` for a + (the page's create action), `edit` for an Edit button, its other actions in the ⋯ menu, and
 * `done` while it is in edit mode, which swaps them all for Done (as on iOS).
 */
export interface BarLink { to: string; label: string; icon: LucideIcon }
export interface PageBar { back?: { to: string; label: string }; link?: BarLink; add?: { label: string; onClick: () => void }; edit?: () => void; actions?: BarAction[]; done?: () => void }

const BarCtx = createContext<{ bar: PageBar | null; set: (b: PageBar | null) => void } | null>(null)

export function BarProvider({ children }: { children: ReactNode }) {
  const [bar, set] = useState<PageBar | null>(null)
  return <BarCtx.Provider value={{ bar, set }}>{children}</BarCtx.Provider>
}

export const useBar = () => useContext(BarCtx)!.bar

/**
 * Registers the page's bar while it is mounted. Callbacks always reach the latest render;
 * the bar itself only updates when what it shows changes.
 */
export function usePageBar(bar: PageBar) {
  const { set } = useContext(BarCtx)!
  const latest = useRef(bar)
  useEffect(() => { latest.current = bar })
  const shape = JSON.stringify({ back: bar.back, link: bar.link && [bar.link.to, bar.link.label], add: bar.add?.label, edit: !!bar.edit, actions: bar.actions?.map((a) => [a.label, !!a.danger]), done: !!bar.done })
  useEffect(() => {
    const b = latest.current
    set({
      back: b.back,
      link: b.link,
      add: b.add && { label: b.add.label, onClick: () => latest.current.add?.onClick() },
      edit: b.edit ? () => latest.current.edit?.() : undefined,
      actions: b.actions?.map((a, i) => ({ label: a.label, icon: a.icon, danger: a.danger, onSelect: () => latest.current.actions?.[i]?.onSelect() })),
      done: b.done ? () => latest.current.done?.() : undefined,
    })
  }, [shape, set])
  useEffect(() => () => set(null), [set])
}

// The back button: a link to `to`, or with `onClick` a step back through the history (the app chooses which).
export function BarBack({ to, label, onClick }: { to: string; label: string; onClick?: () => void }) {
  if (onClick) return <button type="button" className="bar-back" onClick={onClick}><ChevronLeft aria-hidden="true" />{label}</button>
  return <Link to={to} className="bar-back"><ChevronLeft aria-hidden="true" />{label}</Link>
}

// Phones (the same 560px breakpoint as the sheets): the ⋯ opens a bottom drawer instead of a dropdown.
const PHONE = '(max-width: 560px)'
const usePhone = () => useSyncExternalStore(
  (on) => { const m = matchMedia(PHONE); m.addEventListener('change', on); return () => m.removeEventListener('change', on) },
  () => matchMedia(PHONE).matches,
)

/**
 * Right side of the top bar, as on iOS: a page's link icon, ⋯ with its other actions, the page's +, then Edit as plain text at the
 * far right, which turns into a bold Done in the same place while editing.
 */
export function BarMenu({ bar }: { bar: PageBar | null }) {
  if (bar?.done) return <button type="button" className="bar-text is-done" onClick={bar.done}>{t.nav.bar.done}</button>
  return (
    <>
      {bar?.link && <Link to={bar.link.to} className="bar-more" aria-label={bar.link.label} title={bar.link.label}><bar.link.icon aria-hidden="true" /></Link>}
      <BarMore actions={bar?.actions ?? []} />
      {bar?.add && <PlusButton label={bar.add.label} onClick={bar.add.onClick} />}
      {bar?.edit && <button type="button" className="bar-text" onClick={bar.edit}>{t.nav.bar.edit}</button>}
    </>
  )
}

function BarMore({ actions: all }: { actions: BarAction[] }) {
  const phone = usePhone()
  const [open, setOpen] = useState(false)
  // Destructive actions last, in red.
  const actions = [...all.filter((a) => !a.danger), ...all.filter((a) => a.danger)]
  // Pages without actions have no ⋯ at all.
  if (!actions.length) return null
  if (phone) return (
    <>
      <button type="button" className="bar-more" aria-label={t.common.moreActions} data-state={open ? 'open' : 'closed'} onClick={() => setOpen(true)}><MoreHorizontal /></button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="action-sheet">
          <DialogTitle className="sr-only">{t.common.moreActions}</DialogTitle>
          <DialogDescription className="sr-only">{t.common.actionsForPage}</DialogDescription>
          <div className="action-list">
            {actions.map(({ label, icon: Icon, onSelect, danger }) => (
              <button key={label} type="button" className={clx('action-item', danger && 'is-danger')} onClick={() => { setOpen(false); onSelect() }}>
                {Icon && <Icon aria-hidden="true" />}{label}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger className="bar-more" aria-label={t.common.moreActions}><MoreHorizontal /></DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bar-menu">
        {actions.map(({ label, icon: Icon, onSelect, danger }) => (
          <DropdownMenuItem key={label} variant={danger ? 'destructive' : 'default'} onSelect={onSelect}>{Icon && <Icon />}{label}</DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
