import { useState } from 'react'
import { freshId } from '@core/domain/content'
import type { Topic } from '@core/domain/types'
import { monthName, targetFinish } from '@/features/today'
import { useStore } from '@/shared/store/StoreProvider'
import { t } from '@/shared/i18n'
import { AreaField, ColorField, FormSheet, LinesField, SelectField, TextField, cleanLines, fail } from '@/shared/ui'
import { useTopicSave } from '../model/topic'
import type { SheetProps } from './sheet-props'

// Creates and edits the topic itself.
export function TopicSheet({ topic, onSaved, ...sheet }: SheetProps & { topic: Topic; onSaved?: (c: Topic) => void }) {
  const { state } = useStore()
  const save = useTopicSave()
  const [c, setC] = useState(topic)
  const target = targetFinish(c)
  const set = (patch: Partial<Topic>) => setC({ ...c, ...patch })
  const isNew = !topic.id

  return (
    <FormSheet {...sheet} wide title={isNew ? t.topics.form.newTopic : t.common.editNamed(topic.name)} submit={isNew ? t.topics.form.createTopic : t.common.save}
      onSubmit={() => {
        if (!c.name.trim()) return fail(t.topics.form.topicNameFirst)
        const id = c.id || freshId(c.name, state.topics.map((x) => x.id))
        const next: Topic = {
          ...c, id, name: c.name.trim(),
          outcomes: cleanLines(c.outcomes),
        }
        save(next)
        onSaved?.(next)
      }}>
      <div className="grid2">
        <TextField label={t.topics.form.name} value={c.name} onChange={(name) => set({ name })} placeholder={t.topics.form.topicNamePlaceholder} hint={t.topics.form.topicNameHint} required />
        <ColorField value={c.color} onChange={(color) => set({ color })} />
      </div>
      <AreaField label={t.topics.form.about} rows={5} value={c.description ?? ''} onChange={(description) => set({ description })} placeholder={t.topics.form.aboutPlaceholder} hint={t.topics.form.aboutHint} />
      <LinesField label={target ? t.topics.goalsBy(monthName(target)) : t.topics.goals} value={c.outcomes} onChange={(outcomes) => set({ outcomes })} rows={3} />
      {c.kind === 'learn' && (
        <>
          <SelectField label={t.topics.form.duration} value={String(c.months ?? 0)} onChange={(v) => set({ months: Number(v) || undefined })}
            hint={target ? t.topics.form.finishAround(monthName(target)) : t.topics.form.noTargetHint}
            options={[0, 3, 6, 9, 12, 18, 24, 36].map((m) => ({ value: String(m), label: m ? t.topics.form.months(m) : t.topics.form.noTarget }))} />
        </>
      )}
      {/* Stored as one comma-separated string; the Telegram bot reads it to file notes and links. */}
      <LinesField label={t.topics.form.keywords} hint={t.topics.form.keywordsHint} placeholder={t.topics.form.keywordsPlaceholder}
        value={(c.hint ?? '').split(',').map((x) => x.trim()).filter(Boolean)} onChange={(xs) => set({ hint: xs.join(', ') })} />
    </FormSheet>
  )
}
