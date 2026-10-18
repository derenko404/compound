import { usePageBar } from '@/components/bar'
import {
  ChapterField, Fab, FormSheet, RowEdit, SelectField, SwitchField, TextField, WeekdaysField, fail, move, useSheet,
} from '@/components/edit'
import { ChapterTag, Linkify } from '@/components/guide'
import { HABIT_UI } from '@/components/habits'
import { Check, IconBadge, InnerLink, List, Meter, Row, Section, useDoneLastOnOpen } from '@/components/kit'
import { FocusCard, WeekStrip } from '@/components/program'
import { celebrate, toast } from '@/fx/fx'
import { describeWhen, nextPosition, uid } from '@/lib/content'
import { addDays, fmtLong, keyOf } from '@/lib/dates'
import { dayProgress, streak, todayItems, type DayItem, type Slot } from '@/lib/derive'
import { DONE, waterStats } from '@/lib/habits'
import type { Habit, Routine, When } from '@/lib/types'
import { reduce } from '@/store/reduce'
import { useStore } from '@/store/StoreProvider'
import { BookOpen, Crosshair, Feather, Flame, Gauge, Hammer, Pencil, Plus, RotateCcw, type LucideIcon } from 'lucide-react'
import { useState, type CSSProperties } from 'react'

type WhenKind = 'today' | When['kind']

// Rows from the tracks: the badge's icon, label (its tooltip) and colour token.
const SLOT: Record<Slot, [LucideIcon, string, string]> = {
  focus: [Crosshair, 'Focus track', '--slot-focus'],
  light: [Feather, 'Light track', '--slot-light'],
  project: [Hammer, 'Project', '--slot-project'],
  resource: [BookOpen, 'Resource', '--slot-resource'],
  review: [RotateCcw, 'Review', '--slot-review'],
  catchup: [Gauge, 'Catch up', '--slot-catchup'],
}

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
      remove={isNew ? undefined : {
        label: 'Delete task', title: `Delete ${routine.title}?`,
        onConfirm: () => { dispatch({ type: 'deleteRoutine', id: r.id }); toast('Deleted.') },
      }}
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
        <ChapterField value={r.chapter} onChange={(chapter) => set({ chapter: chapter ?? 'own' })} />
        {kind === 'once' && <TextField label="Date" type="date" value={date} onChange={setDate} required />}
        {kind === 'monthly' && (
          <SelectField label="Day of month" value={monthDay} onChange={setMonthDay}
            options={[...Array.from({ length: 28 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) })), { value: '-1', label: 'Last day' }]} />
        )}
        {kind === 'weekly' && <WeekdaysField value={days} onChange={setDays} />}
      </div>
      <SwitchField label="Counts for the streak" sub="A day counts when every streak task due that day is ticked" checked={!!r.core} onChange={(core) => set({ core })} />
    </FormSheet>
  )
}

export function Today() {
  const { state, dispatch } = useStore()
  const [edit, setEdit] = useState(false)
  usePageBar({ actions: [{ label: 'Edit', icon: Pencil, onSelect: () => setEdit(true) }], done: edit ? () => setEdit(false) : undefined })
  const sheet = useSheet<Routine>()
  const today = new Date()
  const k = keyOf(today)
  const items = todayItems(state, today)
  const day = state.days[k] ?? { done: [] }
  const done = new Set(day.done)
  const isDone = (it: DayItem) => it.done ?? done.has(it.id)
  const n = items.filter(isDone).length
  // Past one-off tasks drop out of the editable list.
  const routines = [...state.routines].filter((r) => r.when.kind !== 'once' || r.when.date >= k).sort((a, b) => a.position - b.position)

  const toggleDay = (id: string, on: boolean) => {
    const next = { ...day, done: on ? [...day.done, id] : day.done.filter((x) => x !== id) }
    dispatch({ type: 'day', day: k, log: next })
    if (on) cheer({ ...state, days: { ...state.days, [k]: next } })
  }

  // A habit row's tick goes to the habit's log. Water's tick fills the day's target.
  const toggleHabit = (h: Habit, on: boolean) => {
    const value = on ? (h.type === 'water' ? waterStats(state, h, today).target : DONE) : null
    dispatch({ type: 'habitLog', habit: h.id, day: k, value })
    if (on) cheer(reduce(state, { type: 'habitLog', habit: h.id, day: k, value }))
  }
  const addGlass = (h: Habit) => {
    const value = waterStats(state, h, today).today + 1
    dispatch({ type: 'habitLog', habit: h.id, day: k, value })
  }

  // confetti and the streak when the whole day is done
  const cheer = (next: typeof state) => {
    const p = dayProgress(next, today)
    if (p.done === p.total) {
      setTimeout(celebrate, 250)
      const s = streak(next, today)
      toast(`Day complete. ${s}-day streak.`)
    }
  }

  const addTask = () => sheet.open({ id: uid(), position: nextPosition(state.routines), title: '', chapter: 'own', when: { kind: 'once', date: k }, core: true, created_at: new Date().toISOString() })
  const reorder = (r: Routine, d: -1 | 1) => {
    const i = routines.findIndex((x) => x.id === r.id)
    const ys = move(routines, i, d)
    dispatch({ type: 'batch', ops: ys.flatMap((x, j) => (x.position === j ? [] : [{ type: 'putRoutine' as const, routine: { ...x, position: j } }])) })
  }

  const shown = useDoneLastOnOpen(items, isDone, (it) => it.id)
  const run = streak(state, today)

  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i - ((today.getDay() + 6) % 7))).filter((d) => d <= today)
  const fullDays = week.filter((d) => { const p = dayProgress(state, d); return p.total > 0 && p.done === p.total }).length
  const row = (it: DayItem) => {
    const h = it.habit
    const ui = h && HABIT_UI[h.type]
    return (
      <Row key={it.id} ch={it.ch} done={isDone(it)} style={ui ? ({ '--c': `var(${ui.color})` } as CSSProperties) : undefined}
        title={it.slot ? <Linkify text={it.title} /> : it.title} sub={it.sub ? <Linkify text={it.sub} /> : undefined}
        tag={<>
          {it.slot && <IconBadge icon={SLOT[it.slot][0]} label={SLOT[it.slot][1]} color={SLOT[it.slot][2]} />}
          {ui && <IconBadge icon={ui.icon} label={ui.label} color={ui.color} />}
          {h?.type === 'water' && <button type="button" className="icon-btn" aria-label="Add a glass" onClick={() => addGlass(h)}><Plus aria-hidden="true" /></button>}
          <ChapterTag ch={it.ch} />
        </>}
        check={<Check on={isDone(it)} label={it.title} onToggle={(on) => (h ? toggleHabit(h, on) : toggleDay(it.id, on))} />} />
    )
  }

  return (
    <>
      <header className="today-head">
        <div className="today-title">
          <h1 className="day-date">{fmtLong(today)}</h1>
          {items.length > 0 && <span className="muted"><b className="text-foreground">{n}</b> of {items.length} done</span>}
        </div>
        {items.length > 0 && <Meter value={n / items.length} label={`${n} of ${items.length} done today`} />}
      </header>

      <Section title={edit ? 'Routines' : "Today's goals"} >
        {edit ? (
          <List empty="No routines yet. Add one with +.">
            {routines.map((r, i) => (
              <Row key={r.id} ch={r.chapter} title={r.title} sub={`${describeWhen(r.when)}${r.core ? ', counts for the streak' : ''}`}
                tag={<RowEdit label={r.title} onEdit={() => sheet.open(r)}
                  onUp={i > 0 ? () => reorder(r, -1) : undefined} onDown={i < routines.length - 1 ? () => reorder(r, 1) : undefined} />} />
            ))}
          </List>
        ) : (
          <List empty="Nothing planned today. Add a task with +.">{shown.filter((it) => !it.slot && !it.habit).map(row)}</List>
        )}
      </Section>

      {!edit && shown.some((it) => it.habit) && (
        <Section title="From your habits" aside={<InnerLink to="/wellbeing">Wellbeing</InnerLink>}>
          <List>{shown.filter((it) => it.habit).map(row)}</List>
        </Section>
      )}

      {!edit && shown.some((it) => it.slot) && (
        <Section title="From your tracks" aside="Updates daily">
          <List>{shown.filter((it) => it.slot).map(row)}</List>
        </Section>
      )}

      <Section title="This week" aside={<span className={`today-streak${run ? ' on' : ''}`}><Flame aria-hidden="true" />{run}-day streak, {fullDays} of {week.length} days complete</span>}>
        <WeekStrip />
      </Section>

      <section><FocusCard /></section>



      <Fab label="Add a task" onClick={addTask} />
      {sheet.value && <RoutineSheet key={sheet.value.id} {...sheet.props} routine={sheet.value} />}
    </>
  )
}
