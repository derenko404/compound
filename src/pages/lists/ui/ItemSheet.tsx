import { useState } from 'react'
import { useStore } from '@/shared/store/StoreProvider'
import { FormSheet, TextField, fail } from '@/shared/ui'
import type { ListDef, ListDefItem } from '@core/domain/types'
import { t } from '@/shared/i18n'

export function ItemSheet({ list, item, open, onOpenChange }: { list: ListDef; item: ListDefItem; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { dispatch } = useStore()
  const [it, setIt] = useState(item)
  const isNew = !list.items.some((x) => x.id === item.id)
  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title={isNew ? t.lists.item.addTo(list.name) : t.lists.item.edit} submit={isNew ? t.common.add : t.common.save}
      onSubmit={() => {
        if (!it.title.trim()) return fail(t.lists.item.titleFirst)
        const next = { ...it, title: it.title.trim(), sub: it.sub?.trim() || undefined }
        dispatch({ type: 'putList', list: { ...list, items: isNew ? [next, ...list.items] : list.items.map((x) => (x.id === it.id ? next : x)) } })
      }}>
      <TextField label={t.lists.item.title} value={it.title} onChange={(title) => setIt({ ...it, title })} required full autoFocus />
      <TextField label={list.sub_label || t.lists.item.details} value={it.sub ?? ''} onChange={(sub) => setIt({ ...it, sub })} full />
    </FormSheet>
  )
}
