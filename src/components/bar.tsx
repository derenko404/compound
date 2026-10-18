import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { ChevronLeft, MoreHorizontal, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

export interface BarAction { label: string; icon?: LucideIcon; onSelect: () => void; danger?: boolean }

// What a page puts in the top bar: a back link (inner pages), its actions in the ⋯ menu,
// and `done` while it is in edit mode, which swaps the ⋯ for a Done button.
export interface PageBar { back?: { to: string; label: string }; actions?: BarAction[]; done?: () => void }

const BarCtx = createContext<{ bar: PageBar | null; set: (b: PageBar | null) => void } | null>(null)

export function BarProvider({ children }: { children: ReactNode }) {
  const [bar, set] = useState<PageBar | null>(null)
  return <BarCtx.Provider value={{ bar, set }}>{children}</BarCtx.Provider>
}

export const useBar = () => useContext(BarCtx)!.bar

// Registers the page's bar while it is mounted. Callbacks always reach the latest render;
// the bar itself only updates when what it shows changes.
export function usePageBar(bar: PageBar) {
  const { set } = useContext(BarCtx)!
  const latest = useRef(bar)
  useEffect(() => { latest.current = bar })
  const shape = JSON.stringify({ back: bar.back, actions: bar.actions?.map((a) => [a.label, !!a.danger]), done: !!bar.done })
  useEffect(() => {
    const b = latest.current
    set({
      back: b.back,
      actions: b.actions?.map((a, i) => ({ label: a.label, icon: a.icon, danger: a.danger, onSelect: () => latest.current.actions?.[i]?.onSelect() })),
      done: b.done ? () => latest.current.done?.() : undefined,
    })
  }, [shape, set])
  useEffect(() => () => set(null), [set])
}

export function BarBack({ to, label }: { to: string; label: string }) {
  return <Link to={to} className="bar-back"><ChevronLeft aria-hidden="true" />{label}</Link>
}

// Right side of the top bar: Done while editing, otherwise ⋯ with the page's actions.
export function BarMenu({ bar }: { bar: PageBar | null }) {
  if (bar?.done) return <Button onClick={bar.done}>Done</Button>
  const actions = bar?.actions ?? []
  // Pages without actions have no ⋯ at all.
  if (!actions.length) return null
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger className="bar-more" aria-label="More actions"><MoreHorizontal /></DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bar-menu">
        {/* This page's actions, destructive ones last in red. */}
        {[...actions.filter((a) => !a.danger), ...actions.filter((a) => a.danger)].map(({ label, icon: Icon, onSelect, danger }) => (
          <DropdownMenuItem key={label} variant={danger ? 'destructive' : 'default'} onSelect={onSelect}>{Icon && <Icon />}{label}</DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
