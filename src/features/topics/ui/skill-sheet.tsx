import { useState } from 'react'
import type { Topic, Skill } from '@core/domain/types'
import { t } from '@/shared/i18n'
import { AreaField, FormSheet, LinesField, TextField, fail, linesToItems } from '@/shared/ui'
import { useTopicSave } from '../model/topic'
import type { SheetProps } from './sheet-props'

export function SkillSheet({ topic, skill, ...sheet }: SheetProps & { topic: Topic; skill: Skill }) {
  const save = useTopicSave()
  const [name, setName] = useState(skill.name)
  const [intro, setIntro] = useState(skill.intro ?? '')
  const [lines, setLines] = useState(skill.steps.map((t) => t.text))
  const isNew = !topic.skills.some((x) => x.id === skill.id)
  return (
    <FormSheet {...sheet} wide title={isNew ? t.topics.form.newSkill : t.topics.form.editSkill}
      onSubmit={() => {
        if (!name.trim()) return fail(t.topics.form.skillNameFirst)
        const next: Skill = { ...skill, name: name.trim(), intro: intro.trim() || undefined, steps: linesToItems(lines, skill.steps) }
        save({ ...topic, skills: isNew ? [...topic.skills, next] : topic.skills.map((x) => (x.id === skill.id ? next : x)) })
      }}>
      <TextField label={t.topics.form.name} value={name} onChange={setName} placeholder={t.topics.form.skillNamePlaceholder} required full autoFocus />
      <LinesField label={t.topics.form.stepsInOrder} value={lines} onChange={setLines} placeholder={t.topics.form.stepsPlaceholder} hint={t.topics.form.stepsHint} />
      <AreaField label={t.topics.form.intro} value={intro} onChange={setIntro} rows={3} placeholder={t.topics.form.introPlaceholder} />
    </FormSheet>
  )
}
