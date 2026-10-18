// Share by link: the sheet that makes a link for a topic or a list.
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/fx/fx'
import { SHARE_DAYS, createShare, supabase, type ShareKind } from '@/store/backends'
import { useStore } from '@/store/StoreProvider'
import { t } from '@/i18n'
import type { Topic, ListDef } from '@/core/domain/types'
import { FormSheet } from './edit'
import { CopyButton } from './kit'

// Makes the link on the first tap (a snapshot: editing later doesn't change it), then offers Copy.
export function ShareSheet({ kind, name, data, open, onOpenChange }: {
  kind: ShareKind; name: string; data: Topic | ListDef; open: boolean; onOpenChange: (o: boolean) => void
}) {
  const { mode } = useStore()
  const qc = useQueryClient()
  const [link, setLink] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const make = async () => {
    setBusy(true)
    try {
      const id = await createShare(supabase!, kind, name, data)
      setLink(`${location.origin}/share/${id}`)
      void qc.invalidateQueries({ queryKey: ['shares'] })
    } catch {
      toast.error(t.topics.share.failed)
    } finally {
      setBusy(false)
    }
  }
  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title={t.topics.share.title(name)} submit={t.common.done} onSubmit={() => {}}
      description={t.topics.share.describe(kind, SHARE_DAYS)}>
      {mode !== 'cloud' || !supabase ? (
        <p className="text-muted-foreground span-all">{t.topics.share.signIn}</p>
      ) : link ? (
        <div className="field span-all">
          <Label htmlFor="share-link">{t.topics.share.link}</Label>
          <div className="share-actions">
            <Input id="share-link" readOnly value={link} onFocus={(e) => e.target.select()} />
            <CopyButton text={link} />
          </div>
        </div>
      ) : (
        <Button type="button" className="span-all" disabled={busy} onClick={() => void make()}><Share2 aria-hidden="true" />{busy ? t.topics.share.creating : t.topics.share.create}</Button>
      )}
    </FormSheet>
  )
}
