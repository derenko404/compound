import { useState } from 'react'
import { habitsOf, habitRow, started, tickValue, HABIT_UI, HabitDetails, HabitLogSheet } from '@/features/habits'
import type { Habit } from '@core/domain/types'
import { useStore } from '@/shared/store/StoreProvider'
import { Check, Header, List, Quote, Row, SortList, Section, RemoveButton, moveTo, useSheet, usePageBar, tone } from '@/shared/ui'
import { dates } from '@/shared/lib/dates'
import { t } from '@/shared/i18n'
import { MoodWidget } from './MoodWidget'
import { HabitSheet, newHabit } from './HabitSheet'

const W = t.wellbeing


export function Wellbeing() {
  const { state, dispatch } = useStore()
  const sheet = useSheet<Habit>()
  // A habit's ⋯ opens its log sheet, as on My day.
  const logSheet = useSheet<Habit>()
  const today = new Date()
  const k = dates.keyOf(today)
  const habits = habitsOf(state)
  const [edit, setEdit] = useState(false)
  usePageBar({
    add: { label: W.add, onClick: () => sheet.open(newHabit(state)) },
    edit: habits.length ? () => setEdit(true) : undefined,
    done: edit ? () => setEdit(false) : undefined,
  })
  const reorder = (from: number, to: number) => {
    const ys = moveTo(habits, from, to)
    dispatch({ type: 'batch', ops: ys.flatMap((x, j) => (x.position === j ? [] : [{ type: 'putHabit' as const, habit: { ...x, position: j } }])) })
  }
  return (
    <>
      <Header title={W.title} lead={W.lead} />
      <MoodWidget />
      {/* One quote a day, once today's mood is logged, the same all day: the day's number picks it. */}
      {state.days[k]?.mood && <Quote label={W.quoteOfDay} {...t.quotes[dates.dayDiff(new Date(2024, 0, 1), new Date()) % t.quotes.length]} />}
      <Section title={W.habits}>
        {edit ? (
          <SortList onMove={reorder}>
            {habits.map((h) => (
              <Row key={h.id} title={h.name} sub={HABIT_UI[h.type].label} style={tone(HABIT_UI[h.type].color)}
                check={<RemoveButton label={t.common.deleteNamed(h.name)} title={t.common.deleteAsk(h.name)} description={W.deleteText}
                  onConfirm={() => { dispatch({ type: 'deleteHabit', id: h.id }) }} />}
                onOpen={() => sheet.open(h)} sort />
            ))}
          </SortList>
        ) : habits.length
          ? (
            /* The same rows as My day's habits: a tap logs today, ⋯ opens the log sheet. Every habit, due or not. */
            <List dense>
              {habits.map((h) => {
                const r = habitRow(state, h, today)
                return (
                  <Row key={h.id} title={<span className="font-normal">{r.title}</span>} sub={r.sub} done={r.done} style={tone(HABIT_UI[h.type].color)} tagInline
                    tag={<HabitDetails label={t.wellbeing.logAmount(h.name)} onOpen={() => logSheet.open(h)} />}
                    check={started(h, today) ? <Check on={r.done} label={h.name} progress={r.progress}
                      onToggle={(on) => dispatch({ type: 'habitLog', habit: h.id, day: k, value: tickValue(state, h, today, on) })} /> : undefined} />
                )
              })}
            </List>
          )
          : <List empty={W.empty} />}
      </Section>
      {logSheet.value && <HabitLogSheet key={logSheet.value.id} {...logSheet.props} habit={logSheet.value} />}
      {sheet.value && <HabitSheet key={sheet.value.id} {...sheet.props} habit={sheet.value} />}
    </>
  )
}
