import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { CloudUpload, LogIn, LogOut } from 'lucide-react'
import { Button } from '@/shared/ui/primitives/button'
import { toast } from '@/shared/fx/fx'
import { clearLocalSnapshot, importLocal, loadLocalSnapshot, supabase } from '@/shared/api/backends'
import { useStore } from '@/shared/store/StoreProvider'
import { SettingRow } from '@/shared/ui'
import { t } from '@/shared/i18n'

// Account: who is signed in and syncing, or device-only with a way to sign in.
export function AccountRows() {
  const { mode, session, signOut } = useStore()
  const qc = useQueryClient()
  const [importing, setImporting] = useState(false)
  return mode === 'cloud' ? (
    <>
      <SettingRow title={session?.user.email ?? t.settings.account.signedIn} sub={t.settings.account.syncs}>
        <Button variant="outline" onClick={signOut}><LogOut aria-hidden="true" />{t.settings.account.signOut}</Button>
      </SettingRow>
      <SettingRow title={t.settings.account.importLocal} sub={t.settings.account.importLocalSub}>
        <Button variant="outline" disabled={importing} onClick={async () => {
          const local = await loadLocalSnapshot()
          setImporting(true)
          try {
            await importLocal(supabase!, local)
            clearLocalSnapshot()
            await qc.invalidateQueries({ queryKey: ['state'] })
          } catch (e) {
            console.error(e)
            toast.error(t.settings.account.importFailed)
          } finally {
            setImporting(false)
          }
        }}><CloudUpload aria-hidden="true" />{importing ? t.settings.account.importing : t.settings.account.import}</Button>
      </SettingRow>
    </>
  ) : (
    <SettingRow title={t.settings.account.deviceOnly} sub={supabase ? t.settings.account.signInToSync : t.settings.account.noSupabase}>
      {supabase && <Button onClick={signOut}><LogIn aria-hidden="true" />{t.settings.account.signIn}</Button>}
    </SettingRow>
  )
}
