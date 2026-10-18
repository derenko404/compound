import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { usePageBar, Header, List, Row, Section, SortList, RemoveButton, moveTo, useSheet } from '@/shared/ui'
import { topics } from '@core/domain/content'
import { focusOf } from '@/features/today'
import type { Topic } from '@core/domain/types'
import { useStore } from '@/shared/store/StoreProvider'
import { t } from '@/shared/i18n'
import { TopicSheet, newTopic } from '@/features/topics'
import { TopicCard } from './TopicCard'
import { DELETE_TOPIC } from './delete-topic'

const skillCount = (c: Topic) => t.common.skills(c.skills.length)

export function TopicIndex() {
  const { state, dispatch } = useStore()
  const sheet = useSheet<Topic>()
  const nav = useNavigate()
  const [edit, setEdit] = useState(false)
  usePageBar({ add: { label: t.topics.index.newTopic, onClick: () => sheet.open(newTopic('learn', state.topics)) }, edit: () => setEdit(true), done: edit ? () => setEdit(false) : undefined })
  /**
   * The focus topic when the page opened leads. Switching focus during the visit moves nothing,
   * like ticks with useDoneLastOnOpen; the next visit shows the new order. Edit mode shows the saved order.
   */
  const [lead] = useState(() => focusOf(state))
  const learn = topics(state, 'learn')
  const roadmap = [...learn].sort((a, b) => Number(b.id === lead) - Number(a.id === lead))
  // Personal, the default topic, sits apart under Other. It can't be deleted.
  const other = topics(state, 'general')
  const reorder = (from: number, to: number) => {
    const ys = moveTo(learn, from, to)
    dispatch({ type: 'batch', ops: ys.flatMap((x, j) => (x.position === j ? [] : [{ type: 'putTopic' as const, topic: { ...x, position: j } }])) })
  }

  return (
    <>
      <Header title={t.topics.index.title} lead={t.topics.index.lead} />
      <Section title={t.topics.index.yours}>
        {edit ? (
          <SortList empty={t.topics.index.empty} onMove={reorder}>
            {learn.map((c) => (
              <Row key={c.id} ch={c.id} title={c.name} sub={skillCount(c)}
                check={<RemoveButton label={t.common.deleteNamed(c.name)} title={t.common.deleteAsk(c.name)} description={DELETE_TOPIC} onConfirm={() => dispatch({ type: 'deleteTopic', id: c.id })} />}
                onOpen={() => sheet.open(c)} sort />
            ))}
          </SortList>
        ) : <div className="card-grid">{roadmap.map((c) => <TopicCard key={c.id} c={c} />)}</div>}
      </Section>
      {other.length > 0 && (
        <Section title={t.topics.index.other}>
          {edit
            ? <List>{other.map((c) => <Row key={c.id} ch={c.id} title={c.name} sub={skillCount(c)} onOpen={() => sheet.open(c)} />)}</List>
            : <div className="card-grid">{other.map((c) => <TopicCard key={c.id} c={c} />)}</div>}
        </Section>
      )}
      {sheet.value && <TopicSheet key={sheet.value.id} {...sheet.props} topic={sheet.value}
        onSaved={sheet.value.id ? undefined : (c) => nav({ to: '/topics/$ch', params: { ch: c.id } })} />}
    </>
  )
}
