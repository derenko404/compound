import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useLocation } from '@tanstack/react-router'
import { ChevronDown } from 'lucide-react'
import type { TopicId, Project, ProjectStatus } from '@core/domain/types'
import { useStore } from '@/shared/store/StoreProvider'
import { burst, celebrate } from '@/shared/lib/celebrate'
import { playTick, playUntick } from '@/shared/lib/sound'
import { cvar } from '@/shared/ui'
import { t } from '@/shared/i18n'
import { Linkify } from './linkify'

const LABEL: Record<ProjectStatus, string> = t.topics.project.status
// The badge in a project's header: grey, amber while in progress, green when done.
const STATUS_TONE: Record<ProjectStatus, string> = { todo: '--muted-foreground', doing: '--warn', done: '--good' }
const NEXT: Record<ProjectStatus, ProjectStatus> = { todo: 'doing', doing: 'done', done: 'todo' }

// readOnly: no status button (someone else's shared topic); ch can be left out and the colour comes from around it.
export function ProjectCard({ ch, p, readOnly }: { ch?: TopicId; p: Project; readOnly?: boolean }) {
  const { state, dispatch } = useStore()
  const { hash } = useLocation()
  const sv = state.projects[p.id] ?? 'todo'
  const [open, setOpen] = useState(hash === p.code)
  const ref = useRef<HTMLDivElement>(null)
  const hasBody = !!(p.goal || p.steps?.length || p.done || p.trains?.length || p.size)
  const setStatus = (nx: ProjectStatus) => {
    if (nx === sv) return
    dispatch({ type: 'project', projectId: p.id, status: nx })
    if (nx === 'done') celebrate()
    else if (nx === 'doing') {
      playTick(0.5)
      if (ref.current) burst(ref.current, 14)
    } else playUntick()
  }

  // Arriving from a cross link (#T1) opens and reveals the card.
  useEffect(() => {
    if (!p.code || hash !== p.code) return
    setOpen(true)
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    ref.current?.classList.add('flash')
  }, [hash, p.code])

  return (
    <div ref={ref} id={p.code || p.id} className="project" style={ch ? cvar(ch) : undefined}>
      <div className="project-head">
        <button className="project-code" aria-expanded={open} onClick={() => setOpen(!open)}>{p.code || '•'}</button>
        <button className="project-name" aria-expanded={open} onClick={() => setOpen(!open)}>
          {p.name}
          {hasBody && <ChevronDown className="chev" style={open ? { transform: 'rotate(180deg)' } : undefined} aria-hidden="true" />}
        </button>
        {readOnly ? null : (
          // The status pill is the switch: each tap moves to the next state.
          <button type="button" className="chip tint status-pill" style={{ '--c': `var(${STATUS_TONE[sv]})` } as CSSProperties}
            aria-label={t.topics.project.changeStatus(p.name, LABEL[sv])} onClick={() => setStatus(NEXT[sv])}>
            {LABEL[sv]}
          </button>
        )}
      </div>
      {open && hasBody && (
        <div className="project-body">
          {p.goal && <p><Linkify text={p.goal} /></p>}
          {p.steps && p.steps.length > 0 && <ol>{p.steps.map((s, i) => <li key={i}><Linkify text={s} /></li>)}</ol>}
          <dl>
            {p.done && <><dt>{t.topics.project.doneWhen}</dt><dd><Linkify text={p.done} /></dd></>}
            {p.trains?.length ? <><dt>{t.topics.project.trains}</dt><dd>{p.trains.join(', ')}</dd></> : null}
            {p.size && <><dt>{t.topics.project.size}</dt><dd>{`${t.topics.sizes[p.size].label}, ${t.topics.sizes[p.size].means}`}</dd></>}
          </dl>
        </div>
      )}
    </div>
  )
}
