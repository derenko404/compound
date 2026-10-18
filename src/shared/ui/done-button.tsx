import { useRef, type ComponentType } from 'react'
import { Check as CheckIcon } from 'lucide-react'
import { burst } from '@/shared/lib/celebrate'
import { playTick, playUntick } from '@/shared/lib/sound'
import { t } from '@/shared/i18n'

/**
 * A full-width "done" toggle at the bottom of a card (a habit's tick for today). Coloured by --c; filled when done.
 * Same feedback as Check: the tick sound and a burst. repeat: every press counts up (a glass of water) instead of
 * toggling; it fills once `on` (the target is reached). icon replaces the check mark.
 */
export function DoneButton({ on, label, done = t.nav.kit.doneToday, onToggle, repeat, icon: Icon = CheckIcon }: {
  on: boolean; label: string; done?: string; onToggle: (on: boolean) => void; repeat?: boolean
  icon?: ComponentType<{ 'aria-hidden'?: boolean }>
}) {
  const ref = useRef<HTMLButtonElement>(null)
  return (
    <button ref={ref} type="button" className={`done-btn${on ? ' on' : ''}`} aria-pressed={repeat ? undefined : on}
      onClick={() => {
        const next = repeat || !on
        if (next && ref.current) {
          playTick(1)
          burst(ref.current, 20)
        } else playUntick()
        onToggle(next)
      }}>
      <Icon aria-hidden />{on ? done : label}
    </button>
  )
}
