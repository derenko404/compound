import { TopicField, FormSheet, SelectField, SwitchField, TextField, WeekdaysField, fail } from '@/shared/ui'
import { dates } from '@/shared/lib/dates'
import { t } from '@/shared/i18n'
import type { Routine, When } from '@core/domain/types'
import { useStore } from '@/shared/store/StoreProvider'
import { useState } from 'react'

type WhenKind = 'today' | When['kind']

export function RoutineSheet({ routine, open, onOpenChange }: { routine: Routine; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { state, dispatch } = useStore()
  const today = dates.keyOf(new Date())
  const isNew = !state.routines.some((r) => r.id === routine.id)
  const [r, setR] = useState(routine)
  const [kind, setKind] = useState<WhenKind>(isNew ? 'today' : routine.when.kind)
  const [date, setDate] = useState(routine.when.kind === 'once' ? routine.when.date : today)
  const [days, setDays] = useState(routine.when.kind === 'weekly' ? routine.when.days : [new Date().getDay()])
  const [monthDay, setMonthDay] = useState(String(routine.when.kind === 'monthly' ? routine.when.day : 1))
  const set = (patch: Partial<Routine>) => setR({ ...r, ...patch })

  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title={isNew ? t.today.form.newTitle : t.today.form.editTitle} submit={isNew ? t.today.form.submitNew : t.common.save}
      onSubmit={() => {
        if (!r.title.trim()) return fail(t.today.form.nameFirst)
        if (kind === 'weekly' && !days.length) return fail(t.today.form.pickDay)
        const when: When =
          kind === 'today' ? { kind: 'once', date: today }
          : kind === 'once' ? { kind: 'once', date }
          : kind === 'weekly' ? { kind: 'weekly', days }
          : kind === 'monthly' ? { kind: 'monthly', day: Number(monthDay) }
          : { kind: 'daily' }
        dispatch({ type: 'putRoutine', routine: { ...r, title: r.title.trim(), sub: r.sub?.trim() || undefined, when } })
      }}>
      <TextField label={t.today.form.task} value={r.title} onChange={(title) => set({ title })} placeholder={t.today.form.taskPlaceholder} required full />
      <TextField label={t.today.form.details} value={r.sub ?? ''} onChange={(sub) => set({ sub })} placeholder={t.today.form.optional} full />
      <div className="grid2">
        <SelectField<WhenKind> label={t.today.form.when} value={kind} onChange={setKind} options={[
          { value: 'today', label: t.today.form.todayOnly },
          { value: 'once', label: t.today.form.once },
          { value: 'daily', label: t.today.form.daily },
          { value: 'weekly', label: t.today.form.weekly },
          { value: 'monthly', label: t.today.form.monthly },
        ]} />
        <TopicField value={r.topic} onChange={(topic) => set({ topic: topic ?? 'own' })} />
        {kind === 'once' && <TextField label={t.today.form.date} type="date" value={date} onChange={setDate} required />}
        {kind === 'monthly' && (
          <SelectField label={t.today.form.dayOfMonth} value={monthDay} onChange={setMonthDay}
            options={[...Array.from({ length: 28 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) })), { value: '-1', label: t.today.form.lastDay }]} />
        )}
        {kind === 'weekly' && <WeekdaysField value={days} onChange={setDays} />}
      </div>
      <SwitchField label={t.today.form.countsLabel} sub={t.today.form.countsSub} checked={!!r.core} onChange={(core) => set({ core })} />
    </FormSheet>
  )
}
