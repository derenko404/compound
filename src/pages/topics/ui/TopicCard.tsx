import { Link } from '@tanstack/react-router'
import { Crosshair } from 'lucide-react'
import { Meter, cvar } from '@/shared/ui'
import { focusOf, monthName, targetFinish, nextUp, pace, topicProgress } from '@/features/today'
import type { Topic } from '@core/domain/types'
import { useStore } from '@/shared/store/StoreProvider'
import { currentLocale, t } from '@/shared/i18n'

// One topic on the index: steps done, its focus quarters, and what's next.
export function TopicCard({ c }: { c: Topic }) {
  const { state } = useStore()
  const { done, total } = topicProgress(state, c)
  const focus = focusOf(state) === c.id
  const next = nextUp(state, c)
  // Pace only when there is some: steps a week over the last 4 weeks, and when that finishes the topic.
  const { perWeek, left, finish } = pace(state, c, new Date())
  const end = targetFinish(c)
  const late = !!finish && !!end && finish > end
  const paceLine = perWeek && left && finish
    ? `${t.topics.card.pace(String(perWeek % 1 ? perWeek.toFixed(1) : perWeek), finish.toLocaleDateString(currentLocale(), { month: 'short', year: 'numeric' }))}${late ? t.topics.card.late(monthName(end!)) : ''}`
    : null
  return (
    <Link to="/topics/$ch" params={{ ch: c.id }} className={`topic-card${focus ? ' is-focus' : ''}`} style={cvar(c.id)}>
      <div className="topic-card-head">
        <span className="focus-name"><span className="dot" />{c.name}</span>
        {/* One topic is the focus (heavy): it gets the study sessions and the weekend project. Set from the topic's ⋯ menu. */}
        {focus && <span className="focus-badge"><Crosshair aria-hidden="true" />{t.topics.focus}</span>}
      </div>
      {total > 0 ? (
        <>
          <div className="topic-card-progress"><Meter value={done / total} label={t.topics.card.stepsOf(done, total)} /><span>{t.topics.card.doneOf(done, total)}</span></div>
          {next?.step && <div className="topic-card-now"><span className="focus-label">{t.topics.card.nextIn(next.skill.name)}</span>{next.step.text}</div>}
          {paceLine && <div className={`topic-row-pace${late ? ' late' : ''}`}>{paceLine}</div>}
        </>
      ) : (
        <div className="muted text-small">{t.topics.card.counts(c.skills.length, c.resources.length)}</div>
      )}
    </Link>
  )
}
