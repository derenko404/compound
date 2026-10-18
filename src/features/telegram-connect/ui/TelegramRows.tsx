import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Send, Unlink } from 'lucide-react'
import { Button } from '@/shared/ui/primitives/button'
import { disconnectTelegram, supabase, telegramCode, telegramLink } from '@/shared/api/backends'
import { SettingRow } from '@/shared/ui'
import { t } from '@/shared/i18n'

export const BOT = import.meta.env.VITE_TELEGRAM_BOT as string | undefined

/**
 * Connect Telegram: a one-time code goes into the t.me link; the bot checks it and links this chat to the account.
 * While not linked, the link status is checked every few seconds so the page updates once the bot has done it.
 */
export function TelegramRows() {
  const qc = useQueryClient()
  const link = useQuery({
    queryKey: ['telegram'],
    queryFn: () => telegramLink(supabase!),
    refetchInterval: (q) => (q.state.data ? false : 4000),
  })
  const code = useQuery({
    queryKey: ['telegram-code'],
    queryFn: () => telegramCode(supabase!),
    enabled: link.isSuccess && !link.data,
    staleTime: 10 * 60 * 1000,
  })
  if (link.data) return (
    <SettingRow title={link.data.username ? t.settings.telegram.connectedAs(link.data.username) : t.settings.telegram.connected} sub={t.settings.telegram.connectedSub}>
      <Button variant="outline" onClick={async () => {
        await disconnectTelegram(supabase!)
        await qc.invalidateQueries({ queryKey: ['telegram'] })
      }}><Unlink aria-hidden="true" />{t.settings.telegram.disconnect}</Button>
    </SettingRow>
  )
  return (
    <SettingRow title={t.settings.telegram.connectTitle} sub={t.settings.telegram.connectSub(BOT ?? '')}>
      {code.data
        ? <Button asChild><a href={`https://t.me/${BOT}?start=${code.data}`} target="_blank" rel="noopener"><Send aria-hidden="true" />{t.settings.telegram.connect}</a></Button>
        : <Button disabled><Send aria-hidden="true" />{t.settings.telegram.connect}</Button>}
    </SettingRow>
  )
}
