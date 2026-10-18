import { useEffect, useRef, useState, type ReactNode } from 'react'
import { t } from '@/shared/i18n'
import { LinkButton } from './link-button'

// Long text folded to a few lines, with "Show more" only when it actually overflows.
export function MoreText({ children, lines = 2 }: { children: ReactNode; lines?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [overflows, setOverflows] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const check = () => setOverflows(el.scrollHeight > el.clientHeight + 1)
    check()
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => ro.disconnect()
  }, [children])
  return (
    <div className="more-text">
      <div ref={ref} className={open ? undefined : 'clamp'} style={{ WebkitLineClamp: lines }}>{children}</div>
      {(overflows || open) && (
        <LinkButton aria-expanded={open} onClick={() => setOpen(!open)}>{open ? t.nav.kit.showLess : t.nav.kit.showMore}</LinkButton>
      )}
    </div>
  )
}
