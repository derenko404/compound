import { useState } from 'react'
import { Plus } from 'lucide-react'
import type { Task, Topic } from '@core/domain/types'
import { t } from '@/shared/i18n'
import { Chip, Chips, FormSheet, TextField, fail, useWhenField } from '@/shared/ui'
import { useTopicSave } from '../model/topic'
import type { SheetProps } from './sheet-props'

// A topic's task: what to do and when it's due. Details hide behind a chip, as in Today's task form.
export function TaskSheet({ topic, task, ...sheet }: SheetProps & { topic: Topic; task: Task }) {
  const save = useTopicSave()
  const [title, setTitle] = useState(task.title)
  const [sub, setSub] = useState(task.sub ?? '')
  const [showDetails, setShowDetails] = useState(!!task.sub)
  const when = useWhenField(task.when, ['daily', 'weekly', 'monthly'])
  const isNew = !topic.tasks.some((x) => x.id === task.id)
  return (
    <FormSheet {...sheet} title={isNew ? t.topics.form.newTask : t.topics.form.editTask} submit={isNew ? t.common.add : t.common.save}
      onSubmit={() => {
        if (!title.trim()) return fail(t.today.form.nameFirst)
        const w = when.value()
        if (!w) return false
        const next: Task = { ...task, title: title.trim(), sub: sub.trim() || undefined, when: w }
        save({ ...topic, tasks: isNew ? [...topic.tasks, next] : topic.tasks.map((x) => (x.id === task.id ? next : x)) })
      }}>
      <TextField label={t.today.form.task} hideLabel value={title} onChange={setTitle} placeholder={t.topics.form.taskPlaceholder} hint={t.topics.form.taskHint} full autoFocus />
      <Chips className="m-0">
        {when.chip}
        {!showDetails && <Chip icon={Plus} onClick={() => setShowDetails(true)}>{t.today.form.details}</Chip>}
      </Chips>
      {when.fields}
      {showDetails && <TextField label={t.today.form.details} value={sub} onChange={setSub} placeholder={t.today.form.optional} full />}
    </FormSheet>
  )
}
