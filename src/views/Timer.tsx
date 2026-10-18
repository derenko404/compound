import { useState } from 'react'
import { Pause, Play, RotateCcw, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePageBar } from '@/components/bar'
import { Dial, Header, Segmented, Stepper } from '@/components/kit'
import { FormSheet, TextField, fail } from '@/components/edit'
import { requestPermission, supported } from '@/fx/notify'
import type { Ambient } from '@/fx/sound'
import {
  CUSTOM_MAX, LENGTH_LABEL, customStep, TIMER_DEFAULTS, clock, lengthOf, remaining, timer, useTimer, type Length, type TimerSettings,
} from '@/fx/timer'

const LENGTHS: Length[] = ['short', 'long', 'custom']
const SOUNDS: { value: Ambient; label: string }[] = [
  { value: 'off', label: 'Off' }, { value: 'tick', label: 'Ticking' }, { value: 'rain', label: 'Rain' }, { value: 'brown', label: 'Deep' },
]

// A focus timer: pick a length (short, long, or custom minutes), and a ring counts it down. Start and pause,
// and reset. It keeps running on other pages (see src/fx/timer.ts).
export function Timer() {
  const { state, settings, now } = useTimer()
  const [editing, setEditing] = useState(false)
  usePageBar({ actions: [{ label: 'Timer settings', icon: Settings2, onSelect: () => setEditing(true) }] })
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
      <Header title="Timer" lead="Pick a length, start, and focus until it rings." />
      <div className="timer">
        <Segmented label="Length" value={state.length} onChange={timer.length}
          options={LENGTHS.map((l) => ({ value: l, label: l === 'custom' ? LENGTH_LABEL[l] : `${LENGTH_LABEL[l]} · ${settings[l]} min` }))} />
        {/* Custom minutes: one at a time up to 5, then in fives. Locked once the clock has started, until reset or done. */}
        {state.length === 'custom' && (
          <Stepper label="Custom length" value={`${custom} min`} less="Fewer minutes" more="More minutes"
            onLess={idle && custom > 1 ? () => setCustom(customStep(custom, false)) : undefined}
            onMore={idle && custom < CUSTOM_MAX ? () => setCustom(customStep(custom, true)) : undefined} />
        )}
        <Dial size="lg" n={total - left} total={total} value={clock(left)} sub={running ? 'Focus' : idle ? 'Ready' : 'Paused'} />
        <div className="timer-actions">
          <Button variant="outline" onClick={timer.reset} disabled={idle}><RotateCcw aria-hidden="true" />Reset</Button>
          {running
            ? <Button onClick={timer.pause}><Pause aria-hidden="true" />Pause</Button>
            : <Button onClick={start}><Play aria-hidden="true" />{idle ? 'Start' : 'Resume'}</Button>}
        </div>
        {/* A sound in the background while the clock runs, as focus apps have. */}
        <div className="timer-sound">
          <span className="timer-sound-label">Sound while it runs</span>
          <Segmented label="Sound while it runs" value={settings.sound} onChange={(sound) => timer.settings({ ...settings, sound })} options={SOUNDS} />
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
    <FormSheet open={open} onOpenChange={onOpenChange} title="Timer settings"
      onSubmit={() => {
        const [short, long] = [Math.round(Number(text.short)), Math.round(Number(text.long))]
        if (![short, long].every((m) => m >= 1 && m <= CUSTOM_MAX)) return fail(`Minutes go from 1 to ${CUSTOM_MAX}.`)
        timer.settings({ ...settings, short, long })
      }}>
      <TextField label="Short, minutes" type="number" value={text.short} onChange={(short) => setText({ ...text, short })} />
      <TextField label="Long, minutes" type="number" value={text.long} onChange={(long) => setText({ ...text, long })} />
      <button type="button" className="link-btn span-all justify-self-start"
        onClick={() => setText({ short: String(TIMER_DEFAULTS.short), long: String(TIMER_DEFAULTS.long) })}>
        Back to {TIMER_DEFAULTS.short} and {TIMER_DEFAULTS.long} minutes
      </button>
    </FormSheet>
  )
}
