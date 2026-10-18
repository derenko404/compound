import { useState } from 'react'
import { RESOURCE_KINDS } from '@core/domain/content'
import type { Topic, Resource } from '@core/domain/types'
import { t } from '@/shared/i18n'
import { FormSheet, SelectField, SwitchField, TextField, fail } from '@/shared/ui'
import { useTopicSave } from '../model/topic'
import type { SheetProps } from './sheet-props'

export function ResourceSheet({ topic, resource, ...sheet }: SheetProps & { topic: Topic; resource: Resource }) {
  const save = useTopicSave()
  const [r, setR] = useState(resource)
  const isNew = !topic.resources.some((x) => x.id === resource.id)
  const set = (patch: Partial<Resource>) => setR({ ...r, ...patch })
  return (
    <FormSheet {...sheet} title={isNew ? t.topics.form.newResource : t.topics.form.editResource}
      onSubmit={() => {
        if (!r.title.trim()) return fail(t.topics.form.resourceTitleFirst)
        const next = { ...r, title: r.title.trim(), url: r.url?.trim() || undefined, note: r.note?.trim() || undefined }
        save({ ...topic, resources: isNew ? [...topic.resources, next] : topic.resources.map((x) => (x.id === r.id ? next : x)) })
      }}>
      <TextField label={t.topics.form.title} value={r.title} onChange={(title) => set({ title })} placeholder={t.topics.form.titlePlaceholder} required full />
      <TextField label={t.topics.form.link} type="url" value={r.url ?? ''} onChange={(url) => set({ url })} placeholder="https://" full />
      <div className="grid2">
        <SelectField label={t.topics.form.type} value={r.kind} onChange={(kind) => set({ kind })} options={RESOURCE_KINDS.map((k) => ({ value: k.id, label: t.topics.resourceKind[k.id] }))} />

      </div>
      <TextField label={t.topics.form.note} value={r.note ?? ''} onChange={(note) => set({ note })} full />
      <SwitchField label={t.topics.form.free} checked={!!r.free} onChange={(free) => set({ free })} />
    </FormSheet>
  )
}
