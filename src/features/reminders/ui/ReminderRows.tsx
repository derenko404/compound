import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Switch } from '@/shared/ui/primitives/switch'
import { SettingRow, SettingSelect } from '@/shared/ui'
import { toast } from '@/shared/lib/toast'
import { t } from '@/shared/i18n'
import { EVENING_HOURS, MORNING_HOURS } from '@core/domain/reminders'
import { pushReminders } from '../model/push'

const hour = (h: number) => `${String(h).padStart(2, '0')}:00`
const KEY = ['push-device']

// Settings → Notifications, signed in: daily push reminders on this device and their hours.
export function ReminderRows({ db }: { db: SupabaseClient }) {
  const qc = useQueryClient()
  const device = useQuery({ queryKey: KEY, queryFn: () => pushReminders.current(db) })
  const on = !!device.data
  const tx = t.settings.notify
  const refresh = () => qc.invalidateQueries({ queryKey: KEY })

  const toggle = async (v: boolean) => {
    try {
      if (!v) await pushReminders.disable(db)
      else if (!(await pushReminders.enable(db))) toast.error(tx.blocked)
    } catch (e) {
      console.error('push', e)
      toast.error(tx.remindersFailed)
    }
    await refresh()
  }
  const setHours = async (hours: Parameters<typeof pushReminders.setHours>[1]) => {
    await pushReminders.setHours(db, hours).catch(() => toast.error(tx.remindersFailed))
    await refresh()
  }

  return (
    <>
      <SettingRow title={tx.reminders} sub={tx.remindersSub}>
        <Switch checked={on} disabled={device.isLoading} onCheckedChange={(v) => void toggle(v)} />
      </SettingRow>
      {device.data && (
        <>
          <SettingRow title={tx.morning} sub={tx.morningSub}>
            <SettingSelect label={tx.morning} value={device.data.morning_hour === null ? 'off' : String(device.data.morning_hour)}
              onChange={(v) => void setHours({ morning_hour: v === 'off' ? null : Number(v) })}
              options={[{ value: 'off', label: tx.off }, ...MORNING_HOURS.map((h) => ({ value: String(h), label: hour(h) }))]} />
          </SettingRow>
          <SettingRow title={tx.evening} sub={tx.eveningSub(hour(device.data.evening_hour))}>
            <SettingSelect label={tx.evening} value={String(device.data.evening_hour)}
              onChange={(v) => void setHours({ evening_hour: Number(v) })}
              options={EVENING_HOURS.map((h) => ({ value: String(h), label: hour(h) }))} />
          </SettingRow>
        </>
      )}
    </>
  )
}
