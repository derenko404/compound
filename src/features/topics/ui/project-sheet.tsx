import { useState } from 'react'
import { PROJECT_SIZES, nextProjectCode } from '@core/domain/content'
import type { Topic, Project } from '@core/domain/types'
import { useStore } from '@/shared/store/StoreProvider'
import { t } from '@/shared/i18n'
import { AreaField, FormSheet, LinesField, SelectField, TextField, fail, linesToItems } from '@/shared/ui'
import { useTopicSave } from '../model/topic'
import type { SheetProps } from './sheet-props'

export function ProjectSheet({ topic, project, ...sheet }: SheetProps & { topic: Topic; project: Project }) {
  const save = useTopicSave()
  const { state } = useStore()
  const [p, setP] = useState(project)
  const [steps, setSteps] = useState((project.steps ?? []).map((x) => x.text))
  const isNew = !topic.projects.some((x) => x.id === project.id)
  const set = (patch: Partial<Project>) => setP({ ...p, ...patch })
  return (
    <FormSheet {...sheet} wide title={isNew ? t.topics.form.newProject : t.common.editNamed(project.code)}
      onSubmit={() => {
        if (!p.name.trim()) return fail(t.topics.form.projectNameFirst)
        // The code is made once, from the topic's name; it never changes, so text that mentions it keeps linking.
        const items = linesToItems(steps, project.steps ?? [])
        const next = { ...p, name: p.name.trim(), code: p.code || nextProjectCode(topic, state.topics), steps: items.length ? items : undefined, size: p.size ?? 'small' }
        save({ ...topic, projects: isNew ? [...topic.projects, next] : topic.projects.map((x) => (x.id === p.id ? next : x)) })
      }}>
      <TextField label={t.topics.form.name} value={p.name} onChange={(name) => set({ name })} placeholder={t.topics.form.projectNamePlaceholder} required full autoFocus
        hint={t.topics.form.projectCodeHint(p.code || nextProjectCode(topic, state.topics))} />
      <AreaField label={t.topics.form.goal} value={p.goal ?? ''} onChange={(goal) => set({ goal })} rows={3} />
      <LinesField label={t.topics.form.steps} value={steps} onChange={setSteps} hint={t.topics.form.stepsHint} />
      <TextField label={t.topics.form.doneWhen} value={p.done ?? ''} onChange={(done) => set({ done })} full />
      <LinesField label={t.topics.form.trains} value={p.trains ?? []} onChange={(trains) => set({ trains })} placeholder={t.topics.form.trainsPlaceholder} />
      <SelectField label={t.topics.form.size} value={p.size ?? 'small'} onChange={(size) => set({ size })} options={PROJECT_SIZES.map((z) => ({ value: z.value, label: <>{t.topics.sizes[z.value].label}<span className="text-muted-foreground">{t.topics.sizes[z.value].means}</span></> }))} />
    </FormSheet>
  )
}
