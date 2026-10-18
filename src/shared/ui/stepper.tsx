import type { ReactNode } from 'react'
import { Minus, Plus } from 'lucide-react'

/**
 * − value +: round buttons either side of a big value (water above 10 glasses, the timer's custom minutes).
 * Leave out onLess or onMore to disable that side. less and more label the buttons.
 */
export function Stepper({ label, value, less, more, onLess, onMore }: {
  label: string; value: ReactNode; less: string; more: string; onLess?: (el: HTMLElement) => void; onMore?: (el: HTMLElement) => void
}) {
  return (
    <div className="count-step" role="group" aria-label={label}>
      <button type="button" className="icon-btn" aria-label={less} disabled={!onLess} onClick={(e) => onLess?.(e.currentTarget)}><Minus aria-hidden="true" /></button>
      <span className="count-step-value">{value}</span>
      <button type="button" className="icon-btn" aria-label={more} disabled={!onMore} onClick={(e) => onMore?.(e.currentTarget)}><Plus aria-hidden="true" /></button>
    </div>
  )
}
