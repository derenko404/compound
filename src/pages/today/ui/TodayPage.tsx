import {
  usePageBar, RemoveButton, moveTo, useSheet, Check, IconBadge, InnerLink, List, Meter, Row, SortList, Section, useDoneLastOnOpen,
} from '@/shared/ui'
import { TopicTag, Linkify } from '@/features/topics'
import { HABIT_UI } from '@/features/habits'
import { FocusCard, WeekStrip } from './focus'
import { RoutineSheet } from './RoutineSheet'
import { celebrate } from '@/shared/fx/fx'
import { nextPosition, uid } from '@core/domain/content'
import { dates } from '@/shared/lib/dates'
import { dayProgress, describeWhen, streak, todayItems, type DayItem, type Slot } from '@/features/today'
import { DONE, waterStats } from '@/features/habits'
import { t } from '@/shared/i18n'
import type { Habit, Routine } from '@core/domain/types'
import { reduce } from '@core/domain/reduce'
import { useStore } from '@/shared/store/StoreProvider'
import { BookOpen, Crosshair, Feather, Flame, Gauge, Hammer, Plus, RotateCcw, type LucideIcon } from 'lucide-react'
import { useState, type CSSProperties } from 'react'

// Rows from the topics: the badge's icon, label (its tooltip) and colour token.
const SLOT: Record<Slot, [LucideIcon, string, string]> = {
  focus: [Crosshair, t.today.slot.focus, '--slot-focus'],
  light: [Feather, t.today.slot.light, '--slot-light'],
  project: [Hammer, t.today.slot.project, '--slot-project'],
  resource: [BookOpen, t.today.slot.resource, '--slot-resource'],
  review: [RotateCcw, t.today.slot.review, '--slot-review'],
  catchup: [Gauge, t.today.slot.catchup, '--slot-catchup'],
}

export function Today() {
  const { state, dispatch } = useStore()
  const [edit, setEdit] = useState(false)
  usePageBar({ add: { label: t.today.addTask, onClick: () => addTask() }, edit: () => setEdit(true), done: edit ? () => setEdit(false) : undefined })
  const sheet = useSheet<Routine>()
  const today = new Date()
  const k = dates.keyOf(today)
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
    }
  }

  const addTask = () => sheet.open({ id: uid(), position: nextPosition(state.routines), title: '', topic: 'own', when: { kind: 'once', date: k }, core: true, created_at: new Date().toISOString() })
  const reorder = (from: number, to: number) => {
    const ys = moveTo(routines, from, to)
    dispatch({ type: 'batch', ops: ys.flatMap((x, j) => (x.position === j ? [] : [{ type: 'putRoutine' as const, routine: { ...x, position: j } }])) })
  }

  const shown = useDoneLastOnOpen(items, isDone, (it) => it.id)
  const run = streak(state, today)

  const week = Array.from({ length: 7 }, (_, i) => dates.addDays(today, i - ((today.getDay() + 6) % 7))).filter((d) => d <= today)
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
          {h?.type === 'water' && <button type="button" className="icon-btn" aria-label={t.today.addGlass} onClick={() => addGlass(h)}><Plus aria-hidden="true" /></button>}
          <TopicTag ch={it.ch} />
        </>}
        check={<Check on={isDone(it)} label={it.title} onToggle={(on) => (h ? toggleHabit(h, on) : toggleDay(it.id, on))} />} />
    )
  }

  return (
    <>
      <header className="today-head">
        <div className="today-title">
          <h1 className="day-date">{dates.fmtLong(today)}</h1>
          {items.length > 0 && <span className="muted"><b className="text-foreground">{n}</b>{t.today.doneOf(items.length)}</span>}
        </div>
        {items.length > 0 && <Meter size="lg" value={n / items.length} label={t.today.doneToday(n, items.length)} />}
      </header>

      <Section title={edit ? t.today.routines : t.today.goals} >
        {edit ? (
          <SortList empty={t.today.noRoutines} onMove={reorder}>
            {routines.map((r) => (
              <Row key={r.id} ch={r.topic} title={r.title} sub={`${describeWhen(r.when)}${r.core ? t.today.countsForStreak : ''}`}
                check={<RemoveButton label={t.common.deleteNamed(r.title)} title={t.common.deleteAsk(r.title)} onConfirm={() => { dispatch({ type: 'deleteRoutine', id: r.id }) }} />}
                onOpen={() => sheet.open(r)} sort />
            ))}
          </SortList>
        ) : (
          <List empty={t.today.nothingPlanned}>{shown.filter((it) => !it.slot && !it.habit).map(row)}</List>
        )}
      </Section>

      {!edit && shown.some((it) => it.habit) && (
        <Section title={t.today.fromHabits} aside={<InnerLink to="/wellbeing">{t.today.wellbeing}</InnerLink>}>
          <List>{shown.filter((it) => it.habit).map(row)}</List>
        </Section>
      )}

      {!edit && shown.some((it) => it.slot) && (
        <Section title={t.today.fromTopics} aside={t.today.updatesDaily}>
          <List>{shown.filter((it) => it.slot).map(row)}</List>
        </Section>
      )}

      <Section title={t.today.thisWeek} aside={<span className={`today-streak${run ? ' on' : ''}`}><Flame aria-hidden="true" />{t.today.streakLine(run, fullDays, week.length)}</span>}>
        <WeekStrip />
      </Section>

      <section><FocusCard /></section>



      {sheet.value && <RoutineSheet key={sheet.value.id} {...sheet.props} routine={sheet.value} />}
    </>
  )
}
