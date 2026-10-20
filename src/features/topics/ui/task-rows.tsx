import { matchesWhen } from '@core/domain/content'
import type { Task, TopicId } from '@core/domain/types'
import { Check, List, Row } from '@/shared/ui'
import { describeWhen, useDayTick } from '@/features/today'

/**
 * A topic's tasks: when each is due, with today's tick on the ones due today (the same tick as on Today).
 * readOnly: no ticks (someone else's shared topic).
 */
export function TaskRows({ ch, tasks, readOnly, empty }: { ch?: TopicId; tasks: Task[]; readOnly?: boolean; empty?: string }) {
  const tick = useDayTick()
  const today = new Date()
  return (
    <List empty={empty}>
      {tasks.map((x) => {
        const due = !readOnly && matchesWhen(x.when, today, tick.day)
        return (
          <Row key={x.id} ch={ch} done={due && tick.on(x.id)} title={x.title} sub={[describeWhen(x.when), x.sub].filter(Boolean).join(' · ')}
            check={due ? <Check on={tick.on(x.id)} label={x.title} onToggle={(v) => tick.set(x.id, v)} /> : undefined} />
        )
      })}
    </List>
  )
}
