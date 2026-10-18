import { useState } from 'react'
import { Pause, Play, RotateCcw, Settings2 } from 'lucide-react'
import { Button } from '@/shared/ui/primitives/button'
import { usePageBar, Dial, Header, Segmented, Stepper, FormSheet, TextField, fail } from '@/shared/ui'
import { requestPermission, supported } from '@/shared/fx/notify'
import type { Ambient } from '@/shared/fx/sound'
import {
  CUSTOM_MAX, LENGTH_LABEL, customStep, TIMER_DEFAULTS, clock, lengthOf, remaining, timer, useTimer, type Length, type TimerSettings,
} from '@/features/timer'
import { t } from '@/shared/i18n'

const LENGTHS: Length[] = ['short', 'long', 'custom']
const SOUNDS: { value: Ambient; label: string }[] = [
  { value: 'off', label: t.timer.sounds.off }, { value: 'tick', label: t.timer.sounds.tick }, { value: 'rain', label: t.timer.sounds.rain },
  { value: 'brown', label: t.timer.sounds.brown },
]

// A focus timer: pick a length (short, long, or custom minutes), and a ring counts it down. Start and pause,
// and reset. It keeps running on other pages (see src/fx/timer.ts).
export function Timer() {
  const { state, settings, now } = useTimer()
  const [editing, setEditing] = useState(false)
  usePageBar({ actions: [{ label: t.timer.settings, icon: Settings2, onSelect: () => setEditing(true) }] })
  const total = lengthOf(state.length)
  const left = remaining(state, now)
  const running = !!state.endsAt
  const idle = !running && left === total
  const custom = settings.custom
  const setCustom = (m: number) => timer.settings({ ...settings, custom: m })
  const start = () => {
    // The first start asks once for notifications, so time's up reaches you on another tab or app.
    if (supported() && Notification.permission === 'default') void requestPermission()
    timer.start()
  }

  return (
    <>
      <Header title={t.timer.title} lead={t.timer.lead} />
      <div className="timer">
        <Segmented label={t.timer.length} value={state.length} onChange={timer.length}
          options={LENGTHS.map((l) => ({ value: l, label: l === 'custom' ? LENGTH_LABEL[l] : `${LENGTH_LABEL[l]} · ${t.common.minutes(settings[l])}` }))} />
        {/* Custom minutes: one at a time up to 5, then in fives. Locked once the clock has started, until reset or done. */}
        {state.length === 'custom' && (
          <Stepper label={t.timer.customLength} value={t.common.minutes(custom)} less={t.timer.fewer} more={t.timer.more}
            onLess={idle && custom > 1 ? () => setCustom(customStep(custom, false)) : undefined}
            onMore={idle && custom < CUSTOM_MAX ? () => setCustom(customStep(custom, true)) : undefined} />
        )}
        <Dial size="lg" n={total - left} total={total} value={clock(left)} sub={running ? t.timer.running : idle ? t.timer.ready : t.timer.paused} />
        <div className="timer-actions">
          <Button variant="outline" onClick={timer.reset} disabled={idle}><RotateCcw aria-hidden="true" />{t.timer.reset}</Button>
          {running
            ? <Button onClick={timer.pause}><Pause aria-hidden="true" />{t.timer.pause}</Button>
            : <Button onClick={start}><Play aria-hidden="true" />{idle ? t.timer.start : t.timer.resume}</Button>}
        </div>
        {/* A sound in the background while the clock runs, as focus apps have. */}
        <div className="timer-sound">
          <span className="timer-sound-label">{t.timer.sound}</span>
          <Segmented label={t.timer.sound} value={settings.sound} onChange={(sound) => timer.settings({ ...settings, sound })} options={SOUNDS} />
        </div>
      </div>
      {editing && <TimerSheet open onOpenChange={setEditing} settings={settings} />}
    </>
  )
}

// The minutes behind Short and Long.
function TimerSheet({ settings, open, onOpenChange }: { settings: TimerSettings; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [text, setText] = useState({ short: String(settings.short), long: String(settings.long) })
  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title={t.timer.settings}
      onSubmit={() => {
        const [short, long] = [Math.round(Number(text.short)), Math.round(Number(text.long))]
        if (![short, long].every((m) => m >= 1 && m <= CUSTOM_MAX)) return fail(t.timer.range(CUSTOM_MAX))
        timer.settings({ ...settings, short, long })
      }}>
      <TextField label={t.timer.shortMinutes} type="number" value={text.short} onChange={(short) => setText({ ...text, short })} />
      <TextField label={t.timer.longMinutes} type="number" value={text.long} onChange={(long) => setText({ ...text, long })} />
      <button type="button" className="link-btn span-all justify-self-start"
        onClick={() => setText({ short: String(TIMER_DEFAULTS.short), long: String(TIMER_DEFAULTS.long) })}>
        {t.timer.backTo(TIMER_DEFAULTS.short, TIMER_DEFAULTS.long)}
      </button>
    </FormSheet>
  )
}
