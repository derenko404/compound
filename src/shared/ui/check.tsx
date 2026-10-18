import { useEffect, useRef } from 'react'
import { burst } from '@/shared/lib/celebrate'
import { playTick, playUntick } from '@/shared/lib/sound'

// Round tick button. Plays the bounce, row pop and particle burst when turned on.
export function Check({ on, label, onToggle }: { on: boolean; label: string; onToggle: (on: boolean) => void }) {
  const ref = useRef<HTMLButtonElement>(null)
  const justOn = useRef(false)
  // The bounce class is added after React has applied the new className, or it would be wiped.
  useEffect(() => {
    const el = ref.current
    if (!on || !justOn.current || !el) return
    justOn.current = false
    el.classList.remove('bounce')
    void el.offsetWidth
    el.classList.add('bounce')
  }, [on])
  return (
    <button
      ref={ref}
      className={`check${on ? ' on' : ''}`}
      aria-pressed={on}
      aria-label={label}
      onClick={() => {
        const next = !on
        if (!next) playUntick()
        if (next && ref.current) {
          justOn.current = true
          const list = ref.current.closest('.list')
          const checks = list ? list.querySelectorAll('.check').length : 1
          const ticked = list ? list.querySelectorAll('.check.on').length + 1 : 1
          playTick(ticked / checks)
          burst(ref.current, 20)
        }
        onToggle(next)
      }}
    >
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path d="M3.5 8.5l3 3 6-7" />
      </svg>
    </button>
  )
}
