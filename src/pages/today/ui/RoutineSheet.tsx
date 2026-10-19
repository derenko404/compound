import { ChipMenu, Chip, Chips, FormSheet, SelectField, SwitchField, TextField, WeekdaysField, fail } from '@/shared/ui'
import { dates } from '@/shared/lib/dates'
import { playTick } from '@/shared/lib/sound'
import { t } from '@/shared/i18n'
import { nextPosition, topics, uid } from '@core/domain/content'
import type { Routine, TopicId, When } from '@core/domain/types'
import { useStore } from '@/shared/store/StoreProvider'
import { CalendarDays, Plus } from 'lucide-react'
import { useState } from 'react'

type WhenKind = 'today' | When['kind']

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
  const today = dates.keyOf(new Date())
  const [isNew] = useState(() => !state.routines.some((x) => x.id === routine.id))
  const [r, setR] = useState(() => {
    const last = isNew ? readLastTopic() : null
    return last && state.topics.some((c) => c.id === last && !c.archived) ? { ...routine, topic: last } : routine
  })
  const [kind, setKind] = useState<WhenKind>(isNew ? 'today' : routine.when.kind)
  const [date, setDate] = useState(routine.when.kind === 'once' ? routine.when.date : today)
  const [days, setDays] = useState(routine.when.kind === 'weekly' ? routine.when.days : [new Date().getDay()])
  const [monthDay, setMonthDay] = useState(String(routine.when.kind === 'monthly' ? routine.when.day : 1))
  const [showDetails, setShowDetails] = useState(!!routine.sub)
  const [added, setAdded] = useState(0)
  const set = (patch: Partial<Routine>) => setR({ ...r, ...patch })
  const empty = !r.title.trim()

  // Saves the task. False when something is missing (fail already said what).
  const save = () => {
    if (empty) return fail(t.today.form.nameFirst)
    if (kind === 'weekly' && !days.length) return fail(t.today.form.pickDay)
    const when: When =
      kind === 'today' ? { kind: 'once', date: today }
      : kind === 'once' ? { kind: 'once', date }
      : kind === 'weekly' ? { kind: 'weekly', days }
      : kind === 'monthly' ? { kind: 'monthly', day: Number(monthDay) }
      : { kind: 'daily' }
    const position = isNew && added ? nextPosition(state.routines) : r.position
    dispatch({ type: 'putRoutine', routine: { ...r, position, title: r.title.trim(), sub: r.sub?.trim() || undefined, when } })
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
        <ChipMenu<WhenKind> label={t.today.form.when} icon={CalendarDays} value={kind} onChange={setKind} groups={[{ options: [
          { value: 'today', label: t.today.form.todayOnly },
          { value: 'once', label: t.today.form.once },
          { value: 'daily', label: t.today.form.daily },
          { value: 'weekly', label: t.today.form.weekly },
          { value: 'monthly', label: t.today.form.monthly },
        ] }]} />
        <ChipMenu label={t.nav.edit.topic} value={r.topic} onChange={(topic) => set({ topic })} groups={topicGroups} />
        {!showDetails && <Chip icon={Plus} onClick={() => setShowDetails(true)}>{t.today.form.details}</Chip>}
      </Chips>
      {kind === 'once' && <TextField label={t.today.form.date} type="date" value={date} onChange={setDate} required full />}
      {kind === 'monthly' && (
        <SelectField label={t.today.form.dayOfMonth} value={monthDay} onChange={setMonthDay}
          options={[...Array.from({ length: 28 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) })), { value: '-1', label: t.today.form.lastDay }]} />
      )}
      {kind === 'weekly' && <WeekdaysField value={days} onChange={setDays} />}
      {showDetails && <TextField label={t.today.form.details} value={r.sub ?? ''} onChange={(sub) => set({ sub })} placeholder={t.today.form.optional} full />}
      {!isNew && <SwitchField label={t.today.form.countsLabel} sub={t.today.form.countsSub} checked={!!r.core} onChange={(core) => set({ core })} />}
      {added > 0 && <p className="text-caption text-muted-foreground" aria-live="polite">{t.today.form.added(added)}</p>}
    </FormSheet>
  )
}
