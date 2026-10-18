import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { chapterOf, describeWhen, nextPosition, uid } from '@/lib/content'
import { fmtLong, fmtShort, keyOf } from '@/lib/dates'
import { allTasks, bestStreak, isActive, programPos, quarterPlan, startDate, streak, todayItems } from '@/lib/derive'
import type { Fill, Routine, When } from '@/lib/types'
import { useStore } from '@/store/StoreProvider'
import { celebrate, praise, toast } from '@/fx/fx'
import { usePlanToggle } from './Plan'
import { ChapterTag, Linkify } from '@/components/guide'
import { Banner, Check, Dial, Dot, List, Row, Section, Stats, cvar, useDebounced } from '@/components/kit'
import {
  ChapterField, EditToggle, FormSheet, PlusButton, RowEdit, SelectField, SwitchField, TextField, WeekdaysField, fail, move, useSheet,
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
        {kind === 'once' && <TextField label="Date" type="date" value={date} onChange={setDate} required />}
        {kind === 'monthly' && (
          <SelectField label="Day of month" value={monthDay} onChange={setMonthDay}
            options={[...Array.from({ length: 28 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) })), { value: '-1', label: 'Last day' }]} />
        )}
        {kind === 'weekly' && <WeekdaysField value={days} onChange={setDays} />}
        {r.fill ? (
          <SelectField<Fill> label="Fills from the plan" value={r.fill} onChange={(fill) => set({ fill })} options={[
            { value: 'focus', label: "Focus chapter's task" },
            { value: 'light', label: 'Another chapter, rotating' },
            { value: 'project', label: 'Quarter project' },
          ]} />
        ) : (
          <ChapterField value={r.chapter} onChange={(chapter) => set({ chapter: chapter ?? 'own' })} />
        )}
      </div>
      <SwitchField label="Counts for the streak" sub="A day counts when every streak task is ticked" checked={!!r.core} onChange={(core) => set({ core })} />
      <SwitchField label="Learning log" sub="Shows a one-line text box" checked={!!r.log} onChange={(log) => set({ log })} />
    </FormSheet>
  )
}

export function Today() {
  const { state, dispatch } = useStore()
  const [pulse, setPulse] = useState(0)
  const [edit, setEdit] = useState(false)
  const sheet = useSheet<Routine>()
  const today = new Date()
  const k = keyOf(today)
  const pos = programPos(state, today)
  const Q = quarterPlan(state, pos.q)
  const focus = chapterOf(state, Q.focus)
  const items = todayItems(state, today)
  const day = state.days[k] ?? { done: [] }
  const done = new Set(day.done)
  const n = items.filter((i) => done.has(i.id)).length
  const left = items.length - n
  const saveLog = useDebounced((log: string) => {
    const d = state.days[keyOf(new Date())] ?? { done: [] }
    dispatch({ type: 'day', day: keyOf(new Date()), log: { ...d, log } })
  })
  // Past one-off tasks drop out of the editable list.
  const routines = [...state.routines].filter((r) => r.when.kind !== 'once' || r.when.date >= k).sort((a, b) => a.position - b.position)

  const toggleDay = (id: string, on: boolean) => {
    const next = { ...day, done: on ? [...day.done, id] : day.done.filter((x) => x !== id) }
    if (id === 'smoke-free') next.smoke = on ? 'free' : null
    dispatch({ type: 'day', day: k, log: next })
    if (!on) return
    if (n + 1 === items.length) {
      setPulse((p) => p + 1)
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

  const dayLine = pos.before
    ? `Starts in ${pos.daysToStart} day${pos.daysToStart === 1 ? '' : 's'}`
    : pos.finished ? 'Program complete' : `Day ${pos.dayN} of ${pos.total}`
  const monthTasks = allTasks(state).filter((t) => isActive(t, pos.m))
  const planIds = new Set(allTasks(state).map((t) => t.id))

  return (
    <>
      <div className="day">
        <div>
          <h1 className="day-date">{fmtLong(today)}</h1>
          <div className="day-meta">
            <span className="chip">{dayLine}</span>
            <span className="chip">Q{pos.q}</span>
            {focus && <Link to="/chapters/$ch" params={{ ch: focus.id }} className="chip text-foreground no-underline" style={cvar(focus.id)}><Dot />Focus: {focus.name}</Link>}
          </div>
        </div>
        <Dial n={n} total={items.length} sub="done today" pulse={pulse} />
      </div>

      {pos.before && (
        <Banner actions={
          <Button size="sm" onClick={() => { dispatch({ type: 'settings', patch: { start_date: k } }); toast('Program started. Day 1.') }}>
            Start today instead
          </Button>
        }>
          Your program starts on <b>{fmtShort(startDate(state))}</b>. Anything you tick before then counts as warm-up.
        </Banner>
      )}

      <Stats items={[
        { value: streak(state, today), label: 'day streak' },
        { value: bestStreak(state), label: 'best streak' },
        { value: `${Object.keys(state.plan).filter((id) => planIds.has(id)).length}/${planIds.size}`, label: 'plan tasks done' },
      ]} />

      <Section title="Today" aside={
        <span className="sec-actions">
          <span>{left === 0 ? 'All done.' : `${left} left`}</span>
          <EditToggle on={edit} onChange={setEdit} />
          <PlusButton label="Add a task" onClick={addTask} />
        </span>
      }>
        {edit ? (
          <List empty="No routines yet. Add one with +.">
            {routines.map((r, i) => (
              <Row key={r.id} ch={r.fill ? Q.focus : r.chapter} title={r.title} sub={`${describeWhen(r.when)}${r.core ? ' · streak' : ''}${r.fill ? ' · from the plan' : ''}`}
                tag={<RowEdit label={r.title} onEdit={() => sheet.open(r)} onDelete={() => dispatch({ type: 'deleteRoutine', id: r.id })}
                  onUp={i > 0 ? () => reorder(r, -1) : undefined} onDown={i < routines.length - 1 ? () => reorder(r, 1) : undefined} />} />
            ))}
          </List>
        ) : (
          <List empty="Nothing planned today. Add a task with +.">
            {items.map((it) => (
              <Row key={it.id} ch={it.ch} done={done.has(it.id)} title={it.title} sub={it.sub ? <Linkify text={it.sub} /> : undefined} tag={<ChapterTag ch={it.ch} />}
                check={<Check on={done.has(it.id)} label={it.title} onToggle={(on) => toggleDay(it.id, on)} />}>
                {it.log && (
                  <Input className="mt-2 bg-background" defaultValue={day.log ?? ''} placeholder="Today I learned…" aria-label="Learning log for today"
                    onChange={(e) => saveLog(e.target.value)} />
                )}
              </Row>
            ))}
          </List>
        )}
      </Section>

      <Section title="This month's goals" aside={`Q${pos.q}, month ${pos.mi + 1} of 3`}>
        <List empty="No goals for this month.">
          {monthTasks.map((t) => (
            <Row key={t.id} ch={t.ch} done={!!state.plan[t.id]} title={<Linkify text={t.text} />} tag={<ChapterTag ch={t.ch} />}
              check={<Check on={!!state.plan[t.id]} label={t.text} onToggle={(on) => togglePlan(t.id, on)} />} />
          ))}
        </List>
      </Section>

      {sheet.value && <RoutineSheet key={sheet.value.id} {...sheet.props} routine={sheet.value} />}
    </>
  )
}
