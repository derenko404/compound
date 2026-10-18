import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { Button } from '@/shared/ui/primitives/button'
import { supabase, myShares, deleteShare, SHARE_DAYS, type Share } from '@/shared/api/backends'
import { ConfirmSheet, CopyButton, SettingRow } from '@/shared/ui'
import { t } from '@/shared/i18n'

// "works 5 more days", "works until tonight"
const expiresIn = (created: string) => {
  const days = Math.ceil((new Date(created).getTime() + SHARE_DAYS * 86_400_000 - Date.now()) / 86_400_000)
  return days <= 1 ? t.settings.shares.worksUntilTomorrow : t.settings.shares.worksMore(days)
}

// Links you've shared (topics and lists): copy one again, or delete it so the link stops working.
export function SharedLinksRows() {
  const qc = useQueryClient()
  const shares = useQuery({ queryKey: ['shares'], queryFn: () => myShares(supabase!) })
  const [removing, setRemoving] = useState<Share | null>(null)
  if (!shares.data?.length) return <SettingRow title={t.settings.shares.none} sub={t.settings.shares.noneSub} />
  return (
    <>
      {shares.data.map((s) => (
        <SettingRow key={s.id} title={s.name} sub={`${s.kind === 'topic' ? t.settings.shares.topic : t.settings.shares.list} · ${expiresIn(s.created_at)}`}>
          <div className="flex gap-2">
            <CopyButton text={`${location.origin}/share/${s.id}`} />
            <Button variant="outline" size="icon" aria-label={t.settings.shares.deleteLink(s.name)} onClick={() => setRemoving(s)}><Trash2 aria-hidden="true" /></Button>
          </div>
        </SettingRow>
      ))}
      <ConfirmSheet open={!!removing} onOpenChange={(o) => !o && setRemoving(null)}
        title={t.settings.shares.deleteAsk(removing?.name ?? null)} description={t.settings.shares.deleteSub}
        onConfirm={async () => {
          if (!removing) return
          await deleteShare(supabase!, removing.id)
          await qc.invalidateQueries({ queryKey: ['shares'] })
        }} />
    </>
  )
}
