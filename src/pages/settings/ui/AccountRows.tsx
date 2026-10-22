import { useState } from 'react'
import { LogIn, LogOut } from 'lucide-react'
import { Button } from '@/shared/ui/primitives/button'
import { supabase } from '@/shared/api/backends'
import { useStore } from '@/shared/store/StoreProvider'
import { ConfirmSheet, SettingRow } from '@/shared/ui'
import { t } from '@/shared/i18n'

// Account: who is signed in and syncing, or device-only with a way to sign in.
export function AccountRows() {
  const { mode, session, signOut, pending } = useStore()
  const [ask, setAsk] = useState(false)
  return mode === 'cloud' ? (
    <SettingRow title={session?.user.email ?? t.settings.account.signedIn} sub={t.settings.account.syncs}>
      {/* Signing out removes changes not yet synced, so it asks first. */}
      <Button variant="outline" onClick={() => (pending ? setAsk(true) : void signOut())}><LogOut aria-hidden="true" />{t.settings.account.signOut}</Button>
      <ConfirmSheet open={ask} onOpenChange={setAsk} title={t.settings.account.unsynced(pending)} description={t.settings.account.unsyncedText}
        confirm={t.settings.account.signOutAnyway} onConfirm={() => void signOut()} />
    </SettingRow>
  ) : (
    <SettingRow title={t.settings.account.deviceOnly} sub={supabase ? t.settings.account.signInToSync : t.settings.account.noSupabase}>
      {supabase && <Button onClick={signOut}><LogIn aria-hidden="true" />{t.settings.account.signIn}</Button>}
    </SettingRow>
  )
}
