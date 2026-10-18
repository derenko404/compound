import { supabase } from '@/shared/api/backends'
import { useStore } from '@/shared/store/StoreProvider'
import { Header, Panel, Section, SettingRow } from '@/shared/ui'
import { t } from '@/shared/i18n'
import { AiAccessRows } from '@/features/ai-access'
import { SharedLinksRows } from '@/features/share-link'
import { BOT, TelegramRows } from '@/features/telegram-connect'
import { BackupRows } from '@/features/backup'
import { AccountRows } from './AccountRows'
import { NotifyRows } from './NotifyRows'
import { AppearanceRows } from './AppearanceRows'
import { AboutRows } from './AboutRows'

export function Settings() {
  const { mode } = useStore()

  return (
    <>
      <Header title={t.settings.title} />
      <Section title={t.settings.account.section}>
        <Panel><AccountRows /></Panel>
      </Section>

      <Section title={t.settings.ai.section}>
        <Panel>
          {mode === 'cloud' && supabase
            ? <AiAccessRows />
            : <SettingRow title={t.settings.ai.title} sub={t.settings.ai.signInFirst} />}
        </Panel>
      </Section>

      {mode === 'cloud' && supabase && (
        <Section title={t.settings.shares.section}>
          <Panel><SharedLinksRows /></Panel>
        </Section>
      )}

      {BOT && (
        <Section title={t.settings.telegram.section}>
          <Panel>
            {mode === 'cloud' && supabase
              ? <TelegramRows />
              : <SettingRow title={t.settings.telegram.connectTitle} sub={t.settings.telegram.signInFirst(BOT)} />}
          </Panel>
        </Section>
      )}

      <Section title={t.settings.notify.section}>
        <Panel><NotifyRows /></Panel>
      </Section>

      <Section title={t.settings.appearance.section}>
        <Panel><AppearanceRows /></Panel>
      </Section>

      <Section title={t.settings.backup.section}>
        <Panel><BackupRows /></Panel>
      </Section>

      <Section title={t.settings.about.section}>
        <Panel><AboutRows /></Panel>
      </Section>
    </>
  )
}
