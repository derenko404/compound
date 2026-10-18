import { useState } from 'react'
import { Switch } from '@/shared/ui/primitives/switch'
import { getReminder, requestPermission, setReminder, supported } from '@/shared/lib/reminders'
import { playTick, setSoundOn, soundOn } from '@/shared/lib/sound'
import { toast } from '@/shared/lib/toast'
import { SettingRow } from '@/shared/ui'
import { supabase } from '@/shared/api/backends'
import { useStore } from '@/shared/store/StoreProvider'
import { install } from '@/features/install-app'
import { ReminderRows, pushReminders } from '@/features/reminders'
import { t } from '@/shared/i18n'

/**
 * Sounds and reminders. Signed in, reminders are pushes from the worker (they arrive with the app closed);
 * on iPhone that needs the installed app. Device-only, the open app reminds at 20:00.
 */
export function NotifyRows() {
  const { mode } = useStore()
  const cloud = mode === 'cloud' && supabase ? supabase : null
  const [sound, setSound] = useState(soundOn)
  const [rem, setRem] = useState(getReminder)

  const updateRem = async (r: typeof rem) => {
    if (r.enabled && (await requestPermission()) !== 'granted') {
      toast.error(t.settings.notify.blocked)
      return
    }
    setRem(r)
    setReminder(r)
  }

  return (
    <>
      <SettingRow title={t.settings.notify.sounds} sub={t.settings.notify.soundsSub}>
        <Switch checked={sound} onCheckedChange={(v) => { setSound(v); setSoundOn(v); if (v) playTick(0.5) }} />
      </SettingRow>
      {cloud && pushReminders.supported() ? (
        <ReminderRows db={cloud} />
      ) : cloud && pushReminders.configured() && install.ios() && !install.standalone() ? (
        <SettingRow title={t.settings.notify.reminders} sub={t.settings.notify.installFirst} />
      ) : supported() ? (
        <SettingRow title={t.settings.notify.notifications} sub={t.settings.notify.notificationsSub}>
          <Switch checked={rem.enabled} onCheckedChange={(v) => updateRem({ ...rem, enabled: v })} />
        </SettingRow>
      ) : (
        <SettingRow title={t.settings.notify.notifications} sub={t.settings.notify.unsupported} />
      )}
    </>
  )
}
