import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { TopicId, Project } from '@core/domain/types'
import { Badge, Row, cvar } from '@/shared/ui'
import { t } from '@/shared/i18n'
import { Linkify } from './linkify'

/**
 * A project in a shared topic's preview: read only, so no status and no ticks. It folds open to show the goal, when
 * it's done and its steps. Your own projects open their page instead (ProjectRow, ProjectPage).
 * ch can be left out and the colour comes from around it.
 */
export function ProjectCard({ ch, p }: { ch?: TopicId; p: Project }) {
  const [open, setOpen] = useState(false)
  const facts = [p.steps?.length ? t.common.steps(p.steps.length) : null, p.size ? t.topics.sizes[p.size].label : null, p.trains?.join(', ')].filter(Boolean).join(' · ')
  const hasBody = !!(p.goal || p.done || p.steps?.length)
  return (
    <div id={p.code || p.id} className="project" style={ch ? cvar(ch) : undefined}>
      <div className="project-head">
        <span className="project-code">{p.code || '•'}</span>
        <button className="project-name" aria-expanded={open} onClick={() => setOpen(!open)} disabled={!hasBody}>
          <span className="project-title">{p.name}{facts && <span className="project-status">{facts}</span>}</span>
          {hasBody && <ChevronDown className="chev" style={open ? { transform: 'rotate(180deg)' } : undefined} aria-hidden="true" />}
        </button>
      </div>
      {open && hasBody && (
        <div className="project-body">
          {p.goal && <div className="project-fact"><Badge>{t.topics.form.goal}</Badge><Linkify text={p.goal} /></div>}
          {p.done && <div className="project-fact"><Badge>{t.topics.project.doneWhen}</Badge><Linkify text={p.done} /></div>}
          {p.steps && p.steps.length > 0 && (
            <div className="project-steps">
              {p.steps.map((x) => <Row key={x.id} title={<span className="font-normal"><Linkify text={x.text} /></span>} />)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
