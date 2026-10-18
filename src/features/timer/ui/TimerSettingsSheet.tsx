import { useState } from 'react'
import { FormSheet, TextField, fail } from '@/shared/ui'
import { t } from '@/shared/i18n'
import { CUSTOM_MAX, TIMER_DEFAULTS, timer, type TimerSettings } from '../model/timer'

// The minutes behind Short and Long.
export function TimerSettingsSheet({ settings, open, onOpenChange }: { settings: TimerSettings; open: boolean; onOpenChange: (o: boolean) => void }) {
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
