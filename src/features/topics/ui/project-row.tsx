import type { CSSProperties } from 'react'
import { useNavigate } from '@tanstack/react-router'
import type { Project, TopicId } from '@core/domain/types'
import { Row } from '@/shared/ui'
import { t } from '@/shared/i18n'
import { useTick } from '../model/use-tick'
import { PROJECT_STATUS_LABEL, PROJECT_STATUS_TONE, useProjectStatus } from '../model/project-status'

/**
 * A project in its topic's list: the code and name, then where it stands (in its colour), the steps ticked and its
 * size. A tap opens the project's own page, as iOS lists push a detail page.
 */
export function ProjectRow({ ch, p }: { ch: TopicId; p: Project }) {
  const nav = useNavigate()
  const tick = useTick()
  const { status } = useProjectStatus(p)
  const steps = p.steps?.length ? `${p.steps.filter((x) => tick.on(x.id)).length}/${p.steps.length}` : null
  const facts = [steps, p.size ? t.topics.sizes[p.size].label : null].filter((x): x is string => !!x)
  // The topic keeps the Projects tab in its address, so back from the project returns to it.
  const open = () => {
    void nav({ to: '/topics/$ch', params: { ch }, hash: 'projects', replace: true })
    void nav({ to: '/topics/$ch/projects/$project', params: { ch, project: p.code || p.id } })
  }
  return (
    <Row ch={ch} id={p.code || p.id} onOpen={open}
      title={<span className="title-row">{p.code && <span className="project-code">{p.code}</span>}{p.name}</span>}
      sub={<span className="project-status" style={{ '--c': `var(${PROJECT_STATUS_TONE[status]})` } as CSSProperties}>
        {[<b key="status">{PROJECT_STATUS_LABEL[status]}</b>, ...facts].flatMap((x, i) => (i ? [' · ', x] : [x]))}
      </span>} />
  )
}
