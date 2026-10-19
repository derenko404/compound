import { useEffect, useState } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { CloudAlert, CloudCheck, CloudDownload, CloudOff, CloudUpload, Search, Timer as TimerIcon } from 'lucide-react'
import { BarBack, BarMenu, Brand, useBar } from '@/shared/ui'
import { type SyncState } from '@/shared/store/StoreProvider'
import { clock, remaining, useTimer } from '@/features/timer'
import { t } from '@/shared/i18n'
import { searchSheet } from '@/features/search'

function SyncIcon({ sync }: { sync: SyncState }) {
  const state = sync === 'loadError' || sync === 'saveError' ? 'error' : sync
  const tipText = t.nav.sync[sync]
  const Icon = { loading: CloudDownload, saving: CloudUpload, error: CloudAlert, synced: CloudCheck, local: CloudOff }[state]
  const [tip, setTip] = useState(false)
  useEffect(() => {
    if (!tip) return
    const id = setTimeout(() => setTip(false), 2200)
    return () => clearTimeout(id)
  }, [tip])
  // Tap shows the tooltip on phones; hover and focus show it elsewhere.
  return (
    <button type="button" className={`sync${tip ? ' tip-open' : ''}`} data-state={state} data-tip={tipText} aria-label={tipText} onClick={() => setTip(true)}>
      <Icon aria-hidden="true" />
    </button>
  )
}

// While the timer runs, other pages show the time left in the top bar. Tapping it opens the timer.
function TimerPill() {
  const { state, now } = useTimer()
  const { pathname } = useLocation()
  if (!state.endsAt || pathname === '/timer') return null
  return (
    <Link to="/timer" className="bar-timer" aria-label={t.nav.timerLeft(clock(remaining(state, now)))}>
      <TimerIcon aria-hidden="true" />{clock(remaining(state, now))}
    </Link>
  )
}

// Top-level pages show the brand and sync state; inner pages show only their back link. The right side is the page's ⋯ menu.
export function TopBar({ sync }: { sync: SyncState }) {
  const bar = useBar()
  return (
    <header className="top">
      <div className="flex min-w-0 items-center gap-2">
        {bar?.back ? <BarBack {...bar.back} /> : <Link to="/today" className="text-foreground no-underline"><Brand /></Link>}
        {!bar?.back && <SyncIcon sync={sync} />}
      </div>
      {/* Keeps the bar the same height on pages without a ⋯. */}
      <div className="flex min-h-(--control-md) min-w-0 items-center gap-1">
        <TimerPill />
        {/* Wider screens only: phones open search from More. ⌘K works everywhere. */}
        <button type="button" className="icon-btn bar-search" aria-label={t.search.open} title={`${t.search.open} (⌘K)`} onClick={searchSheet.open}><Search aria-hidden="true" /></button>
        <BarMenu bar={bar} />
      </div>
    </header>
  )
}
