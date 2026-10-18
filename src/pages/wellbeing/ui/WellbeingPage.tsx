import { useState, type CSSProperties } from 'react'
import { habitsOf, HABIT_UI, HabitCard } from '@/features/habits'
import type { Habit } from '@core/domain/types'
import { useStore } from '@/shared/store/StoreProvider'
import { Header, List, Row, SortList, Section, RemoveButton, moveTo, useSheet, usePageBar } from '@/shared/ui'
import { t } from '@/shared/i18n'
import { MoodWidget } from './MoodWidget'
import { HabitSheet, newHabit } from './HabitSheet'

const W = t.wellbeing

const tone = (token: string) => ({ '--c': `var(${token})` }) as CSSProperties

export function Wellbeing() {
  const { state, dispatch } = useStore()
  const sheet = useSheet<Habit>()
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
          ? <div className="widgets">{habits.map((h) => <HabitCard key={h.id} h={h} />)}</div>
          : <List empty={W.empty} />}
      </Section>
      {sheet.value && <HabitSheet key={sheet.value.id} {...sheet.props} habit={sheet.value} />}
    </>
  )
}
