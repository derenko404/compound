// Share by link: the sheet that makes a link for a track or a list.
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Copy, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/fx/fx'
import { SHARE_DAYS, createShare, supabase, type ShareKind } from '@/store/backends'
import { useStore } from '@/store/StoreProvider'
import type { Chapter, ListDef } from '@/lib/types'
import { FormSheet } from './edit'

const NOUN: Record<ShareKind, string> = { track: 'track', list: 'list' }

// Makes the link on the first tap (a snapshot: editing later doesn't change it), then offers Copy.
export function ShareSheet({ kind, name, data, open, onOpenChange }: {
  kind: ShareKind; name: string; data: Chapter | ListDef; open: boolean; onOpenChange: (o: boolean) => void
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
      toast.error("Couldn't make the link. Try again.")
    } finally {
      setBusy(false)
    }
  }
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link!)
      toast('Link copied.')
    } catch {
      toast.error("Couldn't copy. Select the link and copy it by hand.")
    }
  }
  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title={`Share ${name}`} submit="Done" onSubmit={() => {}}
      description={`Anyone with the link can see this ${NOUN[kind]} and add a copy to their own, for ${SHARE_DAYS} days. Your data will not be changed.`}>
      {mode !== 'cloud' || !supabase ? (
        <p className="text-muted-foreground span-all">Sign in to share. Links are kept in your account.</p>
      ) : link ? (
        <div className="field span-all">
          <Label htmlFor="share-link">Link</Label>
          <div className="share-actions">
            <Input id="share-link" readOnly value={link} onFocus={(e) => e.target.select()} />
            <Button type="button" variant="outline" onClick={() => void copy()}><Copy aria-hidden="true" />Copy</Button>
          </div>
        </div>
      ) : (
        <Button type="button" className="span-all" disabled={busy} onClick={() => void make()}><Share2 aria-hidden="true" />{busy ? 'Creating…' : 'Create link'}</Button>
      )}
    </FormSheet>
  )
}
