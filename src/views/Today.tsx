import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Flame } from 'lucide-react'
import { describeWhen, nextPosition, uid } from '@/lib/content'
import { addDays, fmtLong, fmtShort, keyOf } from '@/lib/dates'
import { allTasks, dayProgress, isActive, programPos, quarterPlan, startDate, streak, todayItems, type DayItem } from '@/lib/derive'
import type { Fill, Routine, When } from '@/lib/types'
import { useStore } from '@/store/StoreProvider'
import { celebrate, praise, toast } from '@/fx/fx'
import { usePlanToggle } from './Plan'
import { ChapterTag, Linkify } from '@/components/guide'
import { Check, LinkButton, List, Meter, Row, Section, useDoneLastOnOpen } from '@/components/kit'
import { FocusCard, WeekSlots, WeekStrip } from '@/components/program'
import {
  ChapterField, Fab, FormSheet, RowEdit, SelectField, SwitchField, TextField, WeekdaysField, fail, move, useSheet,
} from '@/components/edit'

type WhenKind = 'today' | When['kind']

function RoutineSheet({ routine, open, onOpenChange }: { routine: Routine; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { state, dispatch } = useStore()
  const today = keyOf(new Date())
  const isNew = !state.routines.some((r) => r.id === routine.id)
  const [r, setR] = useState(routine)
  const [kind, setKind] = useState<WhenKind>(isNew ? 'today' : routine.when.kind)
  const [date, setDate] = useState(routine.when.kind === 'once' ? routine.when.date : today)
  const [days, setDays] = useState(routine.when.kind === 'weekly' ? routine.when.days : [new Date().getDay()])
  const [monthDay, setMonthDay] = useState(String(routine.when.kind === 'monthly' ? routine.when.day : 1))
  const set = (patch: Partial<Routine>) => setR({ ...r, ...patch })

  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title={isNew ? 'New task' : 'Edit task'} submit={isNew ? 'Add task' : 'Save'}
      onDelete={isNew ? undefined : () => { dispatch({ type: 'deleteRoutine', id: r.id }); toast('Deleted.') }}
      onSubmit={() => {
        if (!r.title.trim()) return fail('Give the task a name first.')
        if (kind === 'weekly' && !days.length) return fail('Pick at least one day.')
        const when: When =
          kind === 'today' ? { kind: 'once', date: today }
          : kind === 'once' ? { kind: 'once', date }
          : kind === 'weekly' ? { kind: 'weekly', days }
          : kind === 'monthly' ? { kind: 'monthly', day: Number(monthDay) }
          : { kind: 'daily' }
        dispatch({ type: 'putRoutine', routine: { ...r, title: r.title.trim(), sub: r.sub?.trim() || undefined, when } })
        toast(isNew ? 'Task added.' : 'Saved.')
      }}>
      <TextField label="Task" value={r.title} onChange={(title) => set({ title })} placeholder="Watch one Hussein Nasser video" required full />
      <TextField label="Details" value={r.sub ?? ''} onChange={(sub) => set({ sub })} placeholder="Optional" full />
      <div className="grid2">
        <SelectField<WhenKind> label="When" value={kind} onChange={setKind} options={[
          { value: 'today', label: 'Today only' },
          { value: 'once', label: 'Once, on a date' },
          { value: 'daily', label: 'Every day' },
          { value: 'weekly', label: 'On days of the week' },
          { value: 'monthly', label: 'Every month' },
        ]} />
        {r.fill ? (
          <SelectField<Fill> label="Fills from the plan" value={r.fill} onChange={(fill) => set({ fill })} options={[
            { value: 'focus', label: "Focus chapter's task" },
            { value: 'light', label: 'Another chapter, rotating' },
            { value: 'project', label: 'Quarter project' },
          ]} />
        ) : (
          <ChapterField value={r.chapter} onChange={(chapter) => set({ chapter: chapter ?? 'own' })} />
        )}
        {kind === 'once' && <TextField label="Date" type="date" value={date} onChange={setDate} required />}
        {kind === 'monthly' && (
          <SelectField label="Day of month" value={monthDay} onChange={setMonthDay}
            options={[...Array.from({ length: 28 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) })), { value: '-1', label: 'Last day' }]} />
        )}
        {kind === 'weekly' && <WeekdaysField value={days} onChange={setDays} />}
      </div>
      <SwitchField label="Counts for the streak" sub="A day counts when every streak task is ticked" checked={!!r.core} onChange={(core) => set({ core })} />
    </FormSheet>
  )
}

export function Today() {
  const { state, dispatch } = useStore()
  const [edit, setEdit] = useState(false)
  const sheet = useSheet<Routine>()
  const today = new Date()
  const k = keyOf(today)
  const pos = programPos(state, today)
  const Q = quarterPlan(state, pos.q)
  const items = todayItems(state, today)
  const day = state.days[k] ?? { done: [] }
  const done = new Set(day.done)
  const n = items.filter((i) => done.has(i.id)).length
  // Past one-off tasks drop out of the editable list.
  const routines = [...state.routines].filter((r) => r.when.kind !== 'once' || r.when.date >= k).sort((a, b) => a.position - b.position)

  const toggleDay = (id: string, on: boolean) => {
    const next = { ...day, done: on ? [...day.done, id] : day.done.filter((x) => x !== id) }
    if (id === 'smoke-free') next.smoke = on ? 'free' : null
    dispatch({ type: 'day', day: k, log: next })
    if (!on) return
    if (n + 1 === items.length) {
      setTimeout(celebrate, 250)
      const s = streak({ ...state, days: { ...state.days, [k]: next } }, today)
      toast(`Day complete. ${s}-day streak.`)
    } else toast(praise())
  }

  const togglePlan = usePlanToggle()
  const addTask = () => sheet.open({ id: uid(), position: nextPosition(state.routines), title: '', chapter: Q.focus ?? 'own', when: { kind: 'once', date: k }, created_at: new Date().toISOString() })
  const reorder = (r: Routine, d: -1 | 1) => {
    const i = routines.findIndex((x) => x.id === r.id)
    const ys = move(routines, i, d)
    dispatch({ type: 'batch', ops: ys.flatMap((x, j) => (x.position === j ? [] : [{ type: 'putRoutine' as const, routine: { ...x, position: j } }])) })
  }

  const monthTasks = allTasks(state).filter((t) => isActive(t, pos.m))
  const month = today.toLocaleDateString('en-GB', { month: 'long' })
  const shown = useDoneLastOnOpen(items, (it) => done.has(it.id), (it) => it.id)
  const goals = useDoneLastOnOpen(monthTasks, (t) => !!state.plan[t.id], (t) => t.id)
  const run = streak(state, today)

  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i - ((today.getDay() + 6) % 7))).filter((d) => d <= today)
  const fullDays = week.filter((d) => { const p = dayProgress(state, d); return p.total > 0 && p.done === p.total }).length
  const row = (it: DayItem) => (
    <Row key={it.id} ch={it.ch} done={done.has(it.id)} title={it.title} sub={it.sub ? <Linkify text={it.sub} /> : undefined} tag={<ChapterTag ch={it.ch} />}
      check={<Check on={done.has(it.id)} label={it.title} onToggle={(on) => toggleDay(it.id, on)} />}>
    </Row>
  )

  return (
    <>
      <header className="today-head">
        <div className="today-title">
          <h1 className="day-date">{fmtLong(today)}</h1>
          <span className="muted"><b className="text-foreground">{n}</b> of {items.length} done</span>
        </div>
        <Meter value={items.length ? n / items.length : 0} label={`${n} of ${items.length} done today`} />
        {pos.before && (
          <p className="today-context">
            Your program starts on {fmtShort(startDate(state))}.{' '}
            <LinkButton onClick={() => { dispatch({ type: 'settings', patch: { start_date: k } }); toast('Program started. Day 1.') }}>Start today instead</LinkButton>
          </p>
        )}
      </header>

      <Section title={edit ? 'Routines' : "Today's goals"} aside={<LinkButton onClick={() => setEdit(!edit)}>{edit ? 'Done editing' : 'Edit routines'}</LinkButton>}>
        {edit ? (
          <List empty="No routines yet. Add one with +.">
            {routines.map((r, i) => (
              <Row key={r.id} ch={r.fill ? Q.focus : r.chapter} title={r.title} sub={`${describeWhen(r.when)}${r.core ? ', counts for the streak' : ''}${r.fill ? ', from the plan' : ''}`}
                tag={<RowEdit label={r.title} onEdit={() => sheet.open(r)} onDelete={() => dispatch({ type: 'deleteRoutine', id: r.id })}
                  onUp={i > 0 ? () => reorder(r, -1) : undefined} onDown={i < routines.length - 1 ? () => reorder(r, 1) : undefined} />} />
            ))}
          </List>
        ) : (
          <List empty={items.length ? undefined : 'Nothing planned today. Add a task with +.'}>{shown.map(row)}</List>
        )}
      </Section>

      <Section title="This week" aside={<span className={`today-streak${run ? ' on' : ''}`}><Flame aria-hidden="true" />{run}-day streak, {fullDays} of {week.length} days complete</span>}>
        <div className="grid gap-3">
          <WeekStrip />
          <WeekSlots />
        </div>
      </Section>

      <section><FocusCard /></section>


      <Section title={`${month} goals`} aside={<Link to="/plan">Plan</Link>}>
        <List empty="No goals for this month.">
          {goals.map((t) => (
            <Row key={t.id} ch={t.ch} done={!!state.plan[t.id]} title={<Linkify text={t.text} />} tag={<ChapterTag ch={t.ch} />}
              check={<Check on={!!state.plan[t.id]} label={t.text} onToggle={(on) => togglePlan(t.id, on)} />} />
          ))}
        </List>
      </Section>

      <Fab label="Add a task" onClick={addTask} />
      {sheet.value && <RoutineSheet key={sheet.value.id} {...sheet.props} routine={sheet.value} />}
    </>
  )
}
