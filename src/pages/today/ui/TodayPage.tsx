import {
  usePageBar, RemoveButton, moveTo, useSheet, Check, Dial, FocusMark, Header, InnerLink, Kind, LinkCard, List, Row, SortList, Section, cvar, tone, useDoneLastOnOpen,
} from '@/shared/ui'
import { TopicTag, Linkify } from '@/features/topics'
import { DONE, HABIT_UI, WaterCount, waterStats } from '@/features/habits'
import { InstallBanner } from '@/features/install-app'
import { WeekStrip } from './focus'
import { RoutineSheet } from './RoutineSheet'
import { celebrate } from '@/shared/lib/celebrate'
import { FALLBACK_TOPIC, nextPosition, topicOf, uid } from '@core/domain/content'
import { dates } from '@/shared/lib/dates'
import { SLOT_UI, dayProgress, describeWhen, focusOf, streak, todayItems, type DayItem, type Slot } from '@/features/today'
import { t } from '@/shared/i18n'
import type { Habit, Routine } from '@core/domain/types'
import { reduce } from '@core/domain/reduce'
import { useStore } from '@/shared/store/StoreProvider'
import { Flame } from 'lucide-react'
import { useState, type ReactNode } from 'react'


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

  // Rows from the focus topic get their own section under its name. The rest say which topic they come from.
  const focus = topicOf(state, focusOf(state))
  const fromFocus = (it: DayItem) => !!it.slot && it.ch === focus?.id
  // The sub line of a row from a topic: what it is (Next step, Project…), then its own text.
  const slotSub = (it: DayItem, slot: Slot) => {
    const { label, color } = SLOT_UI[slot]
    const rest = it.sub ? <Linkify text={it.sub} /> : null
    return fromFocus(it)
      ? <Kind label={label} color={color}>{rest}</Kind>
      : <Kind label={topicOf(state, it.ch)?.name}>{label}{rest && <> · {rest}</>}</Kind>
  }
  const row = (it: DayItem) => {
    const h = it.habit
    const ui = h && HABIT_UI[h.type]
    const tag: ReactNode = !it.slot && !h && it.ch !== FALLBACK_TOPIC ? <TopicTag ch={it.ch} /> : null
    return (
      <Row key={it.id} ch={it.ch} done={isDone(it)} style={ui ? tone(ui.color) : undefined} tagInline
        title={it.slot ? <Linkify text={it.title} /> : it.title}
        sub={it.slot ? slotSub(it, it.slot) : it.sub ? <Linkify text={it.sub} /> : undefined}
        tag={tag}
        check={<Check on={isDone(it)} label={it.title} onToggle={(on) => (h ? toggleHabit(h, on) : toggleDay(it.id, on))} />}>
        {h?.type === 'water' && <WaterCount h={h} />}
      </Row>
    )
  }

  return (
    <>
      <InstallBanner />
      {/* The tour's first step points at .today-head. */}
      <div className="today-head">
        <Header title={t.today.title} sub={dates.fmtLong(today)}>
          {items.length > 0 && <Dial size="md" n={n} total={items.length} />}
        </Header>
      </div>

      <Section id="today-tasks" title={edit ? t.today.routines : t.today.goals}>
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

      {!edit && focus && shown.some(fromFocus) && (
        <Section id="today-topics" style={cvar(focus.id)}
          title={<span className="title-row">{focus.name}<FocusMark /></span>}
          aside={<InnerLink to="/topics/$ch" params={{ ch: focus.id }}>{t.today.openTopic}</InnerLink>}>
          <List>{shown.filter(fromFocus).map(row)}</List>
        </Section>
      )}

      {!edit && !focus && (
        <section id="today-topics"><LinkCard to="/topics" title={t.today.focus.label} sub={t.today.focus.none} /></section>
      )}

      {!edit && shown.some((it) => it.slot && !fromFocus(it)) && (
        <Section title={t.today.fromTopics}>
          <List>{shown.filter((it) => it.slot && !fromFocus(it)).map(row)}</List>
        </Section>
      )}

      <Section id="today-week" title={t.today.thisWeek} aside={run ? <span className="today-streak on"><Flame aria-hidden="true" />{t.today.streak(run)}</span> : undefined}>
        <WeekStrip />
      </Section>


      {sheet.value && <RoutineSheet key={sheet.value.id} {...sheet.props} routine={sheet.value} />}
    </>
  )
}
