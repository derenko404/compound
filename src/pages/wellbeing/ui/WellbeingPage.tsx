import { useState } from 'react'
import { habitGlance, habitsOf, HABIT_UI, HabitLogSheet } from '@/features/habits'
import type { Habit } from '@core/domain/types'
import { useStore } from '@/shared/store/StoreProvider'
import { Dial, Header, IconBadge, List, Quote, Row, SortList, Section, RemoveButton, moveTo, useSheet, usePageBar, tone } from '@/shared/ui'
import { dates } from '@/shared/lib/dates'
import { t } from '@/shared/i18n'
import { MoodWidget } from './MoodWidget'
import { HabitSheet, newHabit } from './HabitSheet'

const W = t.wellbeing
// Habit rows share the app's colour: topics alone have their own, so a row's colour means a topic. The icon keeps its type's.
const HABIT_TONE = tone('--primary')


export function Wellbeing() {
  const { state, dispatch } = useStore()
  const sheet = useSheet<Habit>()
  // A habit's row opens its log sheet, the one My day's ⋯ opens.
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
              <Row key={h.id} title={h.name} sub={HABIT_UI[h.type].label} style={HABIT_TONE}
                check={<RemoveButton label={t.common.deleteNamed(h.name)} title={t.common.deleteAsk(h.name)} description={W.deleteText}
                  onConfirm={() => { dispatch({ type: 'deleteHabit', id: h.id }) }} />}
                onOpen={() => sheet.open(h)} sort />
            ))}
          </SortList>
        ) : habits.length
          ? (
            /**
             * My day logs today, Wellbeing looks back: each habit with its type's icon in its colour where My day has
             * the tick, a sentence (where it stands, what's next) and its one ratio in a ring, as the Lists page's
             * cards. A tap opens the log sheet.
             */
            <List>
              {habits.map((h) => {
                const g = habitGlance(state, h, today)
                return (
                  <Row key={h.id} style={HABIT_TONE} title={h.name} sub={g.line} onOpen={() => logSheet.open(h)} tagInline
                    check={<IconBadge icon={HABIT_UI[h.type].icon} label={HABIT_UI[h.type].label} color={HABIT_UI[h.type].color} />}
                    tag={g.n != null && <Dial size="sm" n={g.n} total={g.total} value={g.value} />} />
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
