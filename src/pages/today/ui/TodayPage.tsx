import {
  usePageBar, RemoveButton, moveTo, useSheet, Check, Dial, Header, IconBadge, LinkCard, List, ListGroup, Row, SortList, Section, cvar, empty, tone, useDoneLastOnOpen,
} from '@/shared/ui'
import { Linkify, TaskSheet } from '@/features/topics'
import { HABIT_UI, HabitDetails, HabitLogSheet, tickValue } from '@/features/habits'
import { InstallBanner } from '@/features/install-app'
import { FocusCard } from './FocusCard'
import { TodayWeek } from './focus'
import { RoutineSheet } from './RoutineSheet'
import { celebrate } from '@/shared/lib/celebrate'
import { nextPosition, topicOf, topics, uid } from '@core/domain/content'
import { dates } from '@/shared/lib/dates'
import { dayProgress, describeWhen, focusOf, streak, todayItems, useDayTick, type DayItem } from '@/features/today'
import { t } from '@/shared/i18n'
import type { Habit, Routine, Task, Topic } from '@core/domain/types'
import { reduce } from '@core/domain/reduce'
import { useStore } from '@/shared/store/StoreProvider'
import { Flame } from 'lucide-react'
import { useState } from 'react'


export function Today() {
  const { state, dispatch } = useStore()
  const [edit, setEdit] = useState(false)
  usePageBar({ add: { label: t.today.addTask, onClick: () => addTask() }, edit: () => setEdit(true), done: edit ? () => setEdit(false) : undefined })
  const sheet = useSheet<Routine>()
  // A topic's task opens its own form, the same one as on the topic's page.
  const taskSheet = useSheet<{ topic: Topic; task: Task }>()
  // A habit's ⋯ opens its log sheet, for amounts short of the target and the rest of its details.
  const logSheet = useSheet<Habit>()
  const today = new Date()
  const tick = useDayTick()
  const k = tick.day
  const items = todayItems(state, today)
  const isDone = (it: DayItem) => it.done ?? tick.on(it.id)
  const n = items.filter(isDone).length
  // Past one-off tasks drop out of the editable list.
  const routines = [...state.routines].filter((r) => r.when.kind !== 'once' || r.when.date >= k).sort((a, b) => a.position - b.position)
  // The topics' tasks, editable here too; deleting one takes it off its topic.
  const topicTasks = topics(state, 'learn').flatMap((c) => c.tasks.map((x) => ({ c, x })))
  const removeTask = (c: Topic, x: Task) => dispatch({ type: 'putTopic', topic: { ...c, tasks: c.tasks.filter((y) => y.id !== x.id) } })

  const toggleDay = (id: string, on: boolean) => {
    const next = tick.set(id, on)
    if (on) cheer({ ...state, days: { ...state.days, [k]: next } })
  }

  // A habit row's tick goes to the habit's log. Water's tick fills the day's target.
  const toggleHabit = (h: Habit, on: boolean) => {
    const value = tickValue(state, h, today, on)
    dispatch({ type: 'habitLog', habit: h.id, day: k, value })
    if (on) cheer(reduce(state, { type: 'habitLog', habit: h.id, day: k, value }))
  }

  // A project step's tick goes to the topic's progress, as on the topic's page.
  const togglePlan = (id: string, on: boolean) => {
    const op = { type: 'plan' as const, taskId: id, doneAt: on ? new Date().toISOString() : null }
    dispatch(op)
    if (on) cheer(reduce(state, op))
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
  // Rows from the other topics, one group per topic, in the order they come.
  const otherTopics = [...new Set(shown.filter((it) => it.slot && !fromFocus(it)).map((it) => it.ch))].map((ch) => topicOf(state, ch)).filter((c) => !!c)
  const row = (it: DayItem) => {
    const h = it.habit
    return (
      <Row key={it.id} ch={it.ch} done={isDone(it)} style={h ? tone('--primary') : undefined} className={h ? 'habit-row' : undefined} tagInline
        /**
         * Own tasks lead: habit rows and the topics' suggestions keep a normal-weight title, as steps in a skill do.
         * A habit's name follows its type's icon in the type's colour, as on Wellbeing. The row itself stays blue.
         */
        title={it.slot ? <span className="font-normal"><Linkify text={it.title} /></span> : h ? <span className="title-row font-normal"><IconBadge icon={HABIT_UI[h.type].icon} label={HABIT_UI[h.type].label} color={HABIT_UI[h.type].color} />{it.title}</span> : it.title}
        // Rows from the topics stay quiet: the sub line is their own text, what they are sits on the right as muted text.
        sub={it.sub ? <Linkify text={it.sub} /> : undefined}
        tag={h ? <HabitDetails label={t.wellbeing.logAmount(h.name)} onOpen={() => logSheet.open(h)} /> : undefined}
        check={<Check on={isDone(it)} label={it.title} progress={it.progress} onToggle={(on) => (h ? toggleHabit(h, on) : it.step ? togglePlan(it.step, on) : toggleDay(it.id, on))} />} />
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

      {edit ? (
        <>
          <Section id="today-tasks" group title={t.today.routines}>
            <SortList empty={t.today.noRoutines} onMove={reorder}>
              {routines.map((r) => (
                <Row key={r.id} ch={r.topic} title={r.title} sub={`${describeWhen(r.when)}${r.core ? t.today.countsForStreak : ''}`}
                  check={<RemoveButton label={t.common.deleteNamed(r.title)} title={t.common.deleteAsk(r.title)} onConfirm={() => { dispatch({ type: 'deleteRoutine', id: r.id }) }} />}
                  onOpen={() => sheet.open(r)} sort />
              ))}
            </SortList>
          </Section>
          {topicTasks.length > 0 && (
            <Section group title={t.today.topicTasks}>
              <List>
                {topicTasks.map(({ c, x }) => (
                  <Row key={x.id} ch={c.id} title={x.title} sub={describeWhen(x.when)} tag={<span className="muted text-caption">{c.name}</span>} tagInline
                    check={<RemoveButton label={t.common.deleteNamed(x.title)} title={t.common.deleteAsk(x.title)} onConfirm={() => removeTask(c, x)} />}
                    onOpen={() => taskSheet.open({ topic: c, task: x })} />
                ))}
              </List>
            </Section>
          )}
        </>
      ) : (
        /* One list for the whole day, in labelled groups, so it reads as one set of tasks. */
        <section>
          <List dense>
            <ListGroup id="today-tasks" label={t.today.goals}>
              {shown.some((it) => !it.slot && !it.habit) ? shown.filter((it) => !it.slot && !it.habit).map(row) : empty(t.today.nothingPlanned)}
            </ListGroup>
            {shown.some((it) => it.habit) && (
              <ListGroup id="today-habits" label={t.today.fromHabits}>
                {shown.filter((it) => it.habit).map(row)}
              </ListGroup>
            )}
            {focus && shown.some(fromFocus) && (
              <ListGroup id="today-topics" style={cvar(focus.id)} label={t.today.markedGroup(t.topics.focus, focus.name)}>
                {shown.filter(fromFocus).map(row)}
              </ListGroup>
            )}
            {otherTopics.map((c) => (
              <ListGroup key={c.id} style={cvar(c.id)}
                label={shown.some((it) => it.slot === 'light' && it.ch === c.id) ? t.today.markedGroup(t.topics.secondary, c.name) : c.name}>{shown.filter((it) => it.slot && it.ch === c.id && !fromFocus(it)).map(row)}</ListGroup>
            ))}
          </List>
        </section>
      )}

      {!edit && !focus && (
        <section id="today-topics"><LinkCard to="/topics" title={t.today.focus.label} sub={t.today.focus.none} /></section>
      )}

      <Section id="today-week" group title={t.today.thisWeek} aside={run ? <span className="today-streak on"><Flame aria-hidden="true" />{t.today.streak(run)}</span> : undefined}>
        <TodayWeek />
      </Section>

      {!edit && <Section id="today-focus" group title={t.nav.tabs.timer}><FocusCard /></Section>}


      {sheet.value && <RoutineSheet key={sheet.value.id} {...sheet.props} routine={sheet.value} />}
      {logSheet.value && <HabitLogSheet key={logSheet.value.id} {...logSheet.props} habit={logSheet.value} />}
      {taskSheet.value && <TaskSheet key={taskSheet.value.task.id} {...taskSheet.props} topic={taskSheet.value.topic} task={taskSheet.value.task} />}
    </>
  )
}
