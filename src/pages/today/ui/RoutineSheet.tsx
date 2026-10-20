import { Chip, ChipMenu, Chips, FormSheet, SwitchField, TextField, fail, useWhenField } from '@/shared/ui'
import { playTick } from '@/shared/lib/sound'
import { t } from '@/shared/i18n'
import { nextPosition, topics, uid } from '@core/domain/content'
import type { Routine, TopicId } from '@core/domain/types'
import { useStore } from '@/shared/store/StoreProvider'
import { Plus } from 'lucide-react'
import { useState } from 'react'

// The topic of the last task added on this device, so a run of tasks for one topic doesn't need picking each time.
const LAST_TOPIC = 'roadmap-task-topic'
const readLastTopic = () => { try { return localStorage.getItem(LAST_TOPIC) } catch { return null } }
const saveLastTopic = (id: TopicId) => { try { localStorage.setItem(LAST_TOPIC, id) } catch { /* private mode */ } }

/**
 * Adding is quick: the title is focused, When and Topic are chips, Details hides behind a chip. Return adds the task
 * and clears the field for the next one. The header button adds and closes, or closes once tasks were added.
 * Editing uses the same sheet, plus the streak switch (new tasks count for it by default).
 */
export function RoutineSheet({ routine, open, onOpenChange }: { routine: Routine; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { state, dispatch } = useStore()
  const [isNew] = useState(() => !state.routines.some((x) => x.id === routine.id))
  const [r, setR] = useState(() => {
    const last = isNew ? readLastTopic() : null
    return last && state.topics.some((c) => c.id === last && !c.archived) ? { ...routine, topic: last } : routine
  })
  const when = useWhenField(routine.when, ['today', 'once', 'daily', 'weekly', 'monthly'])
  const [showDetails, setShowDetails] = useState(!!routine.sub)
  const [added, setAdded] = useState(0)
  const set = (patch: Partial<Routine>) => setR({ ...r, ...patch })
  const empty = !r.title.trim()

  // Saves the task. False when something is missing (fail already said what).
  const save = () => {
    if (empty) return fail(t.today.form.nameFirst)
    const w = when.value()
    if (!w) return false
    const position = isNew && added ? nextPosition(state.routines) : r.position
    dispatch({ type: 'putRoutine', routine: { ...r, position, title: r.title.trim(), sub: r.sub?.trim() || undefined, when: w } })
    if (isNew) saveLastTopic(r.topic)
    return true
  }

  // Return in the title: add this one and start the next, keeping When and Topic. On an empty field, close.
  const addAndNext = () => {
    if (empty && added) return onOpenChange(false)
    if (save() === false) return
    playTick(0.3)
    setR({ ...r, id: uid(), title: '', sub: undefined, created_at: new Date().toISOString() })
    setAdded(added + 1)
  }

  const learn = topics(state, 'learn')
  const topicGroups = [
    { options: topics(state, 'general').map((c) => ({ value: c.id, label: c.name, ch: c.id })) },
    ...(learn.length ? [{ label: t.nav.edit.topics, options: learn.map((c) => ({ value: c.id, label: c.name, ch: c.id })) }] : []),
  ]

  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title={isNew ? t.today.form.newTitle : t.today.form.editTitle}
      submit={!isNew ? t.common.save : empty && added ? t.common.done : t.today.form.submitNew}
      onSubmit={() => (empty && added ? undefined : save())}>
      <TextField label={t.today.form.task} hideLabel value={r.title} onChange={(title) => set({ title })} placeholder={t.today.form.taskPlaceholder}
        full autoFocus onEnter={isNew ? addAndNext : undefined} />
      <Chips className="m-0">
        {when.chip}
        <ChipMenu label={t.nav.edit.topic} value={r.topic} onChange={(topic) => set({ topic })} groups={topicGroups} />
        {!showDetails && <Chip icon={Plus} onClick={() => setShowDetails(true)}>{t.today.form.details}</Chip>}
      </Chips>
      {when.fields}
      {showDetails && <TextField label={t.today.form.details} value={r.sub ?? ''} onChange={(sub) => set({ sub })} placeholder={t.today.form.optional} full />}
      {!isNew && <SwitchField label={t.today.form.countsLabel} sub={t.today.form.countsSub} checked={!!r.core} onChange={(core) => set({ core })} />}
      {added > 0 && <p className="text-caption text-muted-foreground" aria-live="polite">{t.today.form.added(added)}</p>}
    </FormSheet>
  )
}
