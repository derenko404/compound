import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useLocation } from '@tanstack/react-router'
import { ChevronDown } from 'lucide-react'
import type { TopicId, Project, ProjectStatus } from '@core/domain/types'
import { useStore } from '@/shared/store/StoreProvider'
import { burst, celebrate } from '@/shared/lib/celebrate'
import { playTick, playUntick } from '@/shared/lib/sound'
import { Badge, Check, Row, cvar } from '@/shared/ui'
import { Button } from '@/shared/ui/primitives/button'
import { t } from '@/shared/i18n'
import { useTick } from '../model/use-tick'
import { Linkify } from './linkify'

const LABEL: Record<ProjectStatus, string> = t.topics.project.status
// The badge in a project's header: grey, amber while in progress, green when done.
const STATUS_TONE: Record<ProjectStatus, string> = { todo: '--muted-foreground', doing: '--warn', done: '--good' }
const NEXT: Record<ProjectStatus, ProjectStatus> = { todo: 'doing', doing: 'done', done: 'doing' }
const NEXT_LABEL: Record<ProjectStatus, string> = t.topics.project.next

// readOnly: no status button (someone else's shared topic); ch can be left out and the colour comes from around it.
export function ProjectCard({ ch, p, readOnly }: { ch?: TopicId; p: Project; readOnly?: boolean }) {
  const { state, dispatch } = useStore()
  const tick = useTick()
  const { hash } = useLocation()
  const sv = state.projects[p.id] ?? 'todo'
  const stepsDone = p.steps?.filter((x) => tick.on(x.id)).length ?? 0
  const [open, setOpen] = useState(hash === p.code)
  const ref = useRef<HTMLDivElement>(null)
  // The header's quiet facts after the status: steps ticked, size, what it trains.
  const facts = [
    p.steps?.length && !readOnly ? `${stepsDone}/${p.steps.length}` : null,
    p.size ? t.topics.sizes[p.size].label : null,
    p.trains?.length ? p.trains.join(', ') : null,
  ].filter((x): x is string => !!x)
  // Your own projects always open: the status button lives inside.
  const hasBody = !readOnly || !!(p.goal || p.steps?.length || p.done || p.trains?.length || p.size)
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
          <span className="project-title">
            {p.name}
            {/* One quiet line: where it stands (in its colour), the steps ticked, its size and what it trains. */}
            {(!readOnly || facts.length > 0) && (
              <span className="project-status" style={{ '--c': `var(${STATUS_TONE[sv]})` } as CSSProperties}>
                {[...(readOnly ? [] : [<b key="status">{LABEL[sv]}</b>]), ...facts].flatMap((x, i) => (i ? [' · ', x] : [x]))}
              </span>
            )}
          </span>
          {hasBody && <ChevronDown className="chev" style={open ? { transform: 'rotate(180deg)' } : undefined} aria-hidden="true" />}
        </button>
      </div>
      {open && hasBody && (
        <div className="project-body">
          {/* What it is: the goal and when it counts as done, each a small pill label with its text under it. */}
          {p.goal && <div className="project-fact"><Badge>{t.topics.form.goal}</Badge><Linkify text={p.goal} /></div>}
          {p.done && <div className="project-fact"><Badge color="--good">{t.topics.project.doneWhen}</Badge><Linkify text={p.done} /></div>}
          {/* Then the steps, ticked like a skill's; the one Today shows is the first still open. */}
          {p.steps && p.steps.length > 0 && (
            <div className="project-steps">
              {p.steps.map((x) => (
                <Row key={x.id} done={!readOnly && tick.on(x.id)} title={<span className="font-normal"><Linkify text={x.text} /></span>}
                  check={readOnly ? undefined : <Check on={tick.on(x.id)} label={x.text} onToggle={(v) => tick.set(x.id, v)} />} />
              ))}
            </div>
          )}
          {/* The next step in words: start it, finish it, or take a finished one back up. */}
          {!readOnly && (
            // In the colour of the state it moves to: amber to start, green to finish, amber to take it back up.
            <Button variant="tint" style={{ '--tint': `var(${STATUS_TONE[NEXT[sv]]})` } as CSSProperties} onClick={() => setStatus(NEXT[sv])}>{NEXT_LABEL[sv]}</Button>
          )}
        </div>
      )}
    </div>
  )
}
