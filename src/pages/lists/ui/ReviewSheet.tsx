import { useState } from 'react'
import { useStore } from '@/shared/store/StoreProvider'
import { AreaField, FormSheet } from '@/shared/ui'
import type { ListDef, ListDefItem } from '@core/domain/types'
import { t } from '@/shared/i18n'

// A note on one item: its own sheet, so rows stay one line tall.
export function ReviewSheet({ list, item, open, onOpenChange }: { list: ListDef; item: ListDefItem; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { state, dispatch } = useStore()
  const p = state.listProgress[list.id]?.[item.id] ?? {}
  const [note, setNote] = useState(p.note ?? '')
  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title={item.sub ? `${item.title} (${item.sub})` : item.title} submit={t.common.save}
      onSubmit={() => {
        dispatch({ type: 'listItem', list: list.id, item: item.id, progress: { ...p, note: note.trim() || null } })
      }}>
      <AreaField label={t.lists.review.label} value={note} onChange={setNote} rows={4} placeholder={t.lists.review.placeholder} />
    </FormSheet>
  )
}
