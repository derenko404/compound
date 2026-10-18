import type { TopicId, Skill } from '@core/domain/types'
import { Check, Fold, Row } from '@/shared/ui'
import { t } from '@/shared/i18n'
import { useTick } from '../model/use-tick'
import { Linkify } from './linkify'

/**
 * Skills as folds: intro and steps in order, each tickable. The skill you're on starts open, marked "now".
 * readOnly: no ticks (someone else's shared topic).
 */
export function SkillFolds({ ch, skills, current, itemsLabel = t.topics.skills.stepsInOrder, readOnly }: {
  ch?: TopicId; skills: Skill[]; current?: string; itemsLabel?: string; readOnly?: boolean
}) {
  const tick = useTick()
  return (
    <div className="grid gap-3">
      {skills.map((k) => {
        const done = k.steps.filter((t) => tick.on(t.id)).length
        return (
          <Fold key={k.id} ch={ch} open={k.id === current || undefined} title={k.id === current ? t.topics.skills.now(k.name) : k.name} meta={readOnly ? t.common.steps(k.steps.length) : `${done}/${k.steps.length}`}>
            {k.intro && <p className="fold-intro"><Linkify text={k.intro} /></p>}
            {k.steps.length > 0 && <div className="list-label">{itemsLabel}</div>}
            {k.steps.map((it) => (
              <Row key={it.id} ch={ch} done={!readOnly && tick.on(it.id)} title={<span className="font-normal"><Linkify text={it.text} /></span>}
                check={readOnly ? undefined : <Check on={tick.on(it.id)} label={it.text} onToggle={(v) => tick.set(it.id, v)} />} />
            ))}
            {!k.steps.length && <div className="empty">{t.topics.empty.steps}</div>}
          </Fold>
        )
      })}
    </div>
  )
}
