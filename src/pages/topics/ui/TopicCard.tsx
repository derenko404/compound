import { Link } from '@tanstack/react-router'
import { Dial, FocusMark, Kind, cvar } from '@/shared/ui'
import { SLOT_UI, focusOf, monthName, targetFinish, nextUp, pace, topicProgress } from '@/features/today'
import type { Topic } from '@core/domain/types'
import { useStore } from '@/shared/store/StoreProvider'
import { currentLocale, t } from '@/shared/i18n'
import { clx } from '@/shared/lib/clx'

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
    <Link to="/topics/$ch" params={{ ch: c.id }} className={clx('topic-card', focus && 'is-focus')} style={cvar(c.id)}>
      <div className="topic-card-head">
        <span className="focus-name"><span className="dot" />{c.name}</span>
        {/* One topic is the focus (heavy): it gets the study sessions and the weekend project. Set from the topic's ⋯ menu. */}
        {focus && <FocusMark />}
      </div>
      {total > 0 ? (
        <>
          <Dial size="sm" n={done} total={total}>
            {next?.step && <span className="topic-card-now"><span className="topic-card-step">{next.step.text}</span><span><Kind label={SLOT_UI.focus.label} color={SLOT_UI.focus.color}>{next.skill.name}</Kind></span></span>}
          </Dial>
          {paceLine && <div className={clx('topic-row-pace', late && 'late')}>{paceLine}</div>}
        </>
      ) : (
        <div className="muted text-small">{t.topics.card.counts(c.skills.length, c.resources.length)}</div>
      )}
    </Link>
  )
}
