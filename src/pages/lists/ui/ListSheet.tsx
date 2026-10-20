import { useState } from 'react'
import { useStore } from '@/shared/store/StoreProvider'
import { FormSheet, TextField, fail } from '@/shared/ui'
import type { ListDef } from '@core/domain/types'
import { freshId } from '@core/domain/content'
import { t } from '@/shared/i18n'

export function ListSheet({ list, open, onOpenChange, onSaved }: { list: ListDef; open: boolean; onOpenChange: (o: boolean) => void; onSaved: (id: string) => void }) {
  const { state, dispatch } = useStore()
  const [l, setL] = useState(list)
  const isNew = !list.id
  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title={isNew ? t.lists.newList : t.common.editNamed(list.name)} submit={isNew ? t.lists.sheet.createList : t.common.save}
      onSubmit={() => {
        if (!l.name.trim()) return fail(t.lists.sheet.nameFirst)
        const id = l.id || freshId(l.name, state.lists.map((x) => x.id))
        dispatch({ type: 'putList', list: { ...l, id, name: l.name.trim(), title: l.title.trim() || l.name.trim(), sub_label: l.sub_label.trim() } })
        onSaved(id)
      }}>
      <div className="grid2">
        <TextField label={t.lists.sheet.shortName} value={l.name} onChange={(name) => setL({ ...l, name })} placeholder={t.lists.sheet.shortNamePlaceholder} required autoFocus />
        <TextField label={t.lists.sheet.detail} value={l.sub_label} onChange={(sub_label) => setL({ ...l, sub_label })} placeholder={t.lists.sheet.detailPlaceholder} hint={t.lists.sheet.detailHint} />
      </div>
      <TextField label={t.lists.sheet.title} value={l.title} onChange={(title) => setL({ ...l, title })} placeholder={t.lists.sheet.titlePlaceholder} full />
    </FormSheet>
  )
}
