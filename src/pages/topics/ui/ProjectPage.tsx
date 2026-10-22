import { useState, type CSSProperties } from 'react'
import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { Check as CheckIcon, Pencil, Play, RotateCcw, Trash2 } from 'lucide-react'
import { Badge, Check, ConfirmSheet, Header, List, Row, Section, cvar, usePageBar } from '@/shared/ui'
import { Button } from '@/shared/ui/primitives/button'
import { celebrate } from '@/shared/lib/celebrate'
import { topicOf } from '@core/domain/content'
import type { Project, Topic } from '@core/domain/types'
import { useStore } from '@/shared/store/StoreProvider'
import { t } from '@/shared/i18n'
import { Linkify, PROJECT_NEXT, PROJECT_NEXT_LABEL, PROJECT_STATUS_LABEL, PROJECT_STATUS_TONE, ProjectSheet, useProjectStatus, useTick, useTopicSave } from '@/features/topics'

const route = getRouteApi('/topics/$ch/projects/$project')

/**
 * A project's own page, pushed from its topic's Projects tab (as iOS lists open a detail page): the goal, the steps to
 * tick (they set its status), and when it counts as done. Edit and Delete are in the ⋯ menu.
 */
export function ProjectPage() {
  const { ch, project } = route.useParams()
  const { state } = useStore()
  const c = topicOf(state, ch)
  // Links name a project by its code (EN1); one without a code by its id.
  const p = c?.projects.find((x) => x.code === project || x.id === project)
  const nav = useNavigate()
  const save = useTopicSave()
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  usePageBar({
    back: { to: `/topics/${ch}#projects`, label: c?.name ?? t.topics.page.back },
    actions: p ? [
      { label: t.common.edit, icon: Pencil, onSelect: () => setEditing(true) },
      { label: t.common.delete, icon: Trash2, danger: true, onSelect: () => setDeleting(true) },
    ] : undefined,
  })
  if (!c || !p) return <List empty={t.nav.notFound} />
  return <ProjectView key={p.id} topic={c} p={p} editing={editing} setEditing={setEditing} deleting={deleting} setDeleting={setDeleting}
    onDelete={() => { save({ ...c, projects: c.projects.filter((x) => x.id !== p.id) }); void nav({ to: '/topics/$ch', params: { ch: c.id }, hash: 'projects' }) }} />
}

function ProjectView({ topic, p, editing, setEditing, deleting, setDeleting, onDelete }: {
  topic: Topic; p: Project
  editing: boolean; setEditing: (v: boolean) => void; deleting: boolean; setDeleting: (v: boolean) => void; onDelete: () => void
}) {
  const ch = topic.id
  const tick = useTick()
  const { status, set } = useProjectStatus(p)
  const steps = p.steps ?? []
  const done = steps.filter((x) => tick.on(x.id)).length
  // Ticking the last step finishes the project: confetti, as when a day is done.
  const toggle = (id: string, on: boolean) => {
    tick.set(id, on)
    if (on && done + 1 === steps.length) setTimeout(celebrate, 250)
  }
  // Above the name: its code as a badge, then what it trains and its size.
  const facts = [p.trains?.join(', '), p.size ? t.topics.sizes[p.size].label : null].filter((x): x is string => !!x)
  return (
    <div style={cvar(ch)}>
      <Header title={p.name} kicker={
        <span className="title-row">
          {p.code && <span className="project-code">{p.code}</span>}
          {/* Where it stands, as a badge in its colour: grey, amber in progress, green when done. */}
          <Badge color={PROJECT_STATUS_TONE[status]}>{PROJECT_STATUS_LABEL[status]}</Badge>
          {facts.join(' · ')}
        </span>} />
      {/* The goal is what the page is about: normal text, not a muted lead. */}
      {p.goal && <p className="page-intro"><Linkify text={p.goal} /></p>}
      {steps.length > 0 && (
        <Section group title={t.topics.form.steps} aside={`${done}/${steps.length}`}>
          {/* Ticked like a skill's steps; the one My day shows is the first still open. */}
          <List>
            {steps.map((x) => (
              <Row key={x.id} ch={ch} done={tick.on(x.id)} title={<span className="font-normal"><Linkify text={x.text} /></span>}
                check={<Check on={tick.on(x.id)} label={x.text} onToggle={(v) => toggle(x.id, v)} />} />
            ))}
          </List>
        </Section>
      )}
      {p.done && (
        <Section group title={t.topics.project.doneWhen}>
          <List><p className="list-text"><Linkify text={p.done} /></p></List>
        </Section>
      )}
      <div className="page-actions">
        {/* By hand only what the steps can't say: starting, and for a project without steps, finishing and back. */}
        {/* ▶ to start (the app's blue), ✓ to finish (green), ↺ to go back (outlined). */}
        {(!steps.length || status === 'todo') && (
          <Button variant={status === 'done' ? 'outline' : 'tint'} style={status === 'doing' ? { '--tint': 'var(--good)' } as CSSProperties : undefined} onClick={() => set(PROJECT_NEXT[status])}>
            {status === 'todo' ? <Play aria-hidden="true" /> : status === 'doing' ? <CheckIcon aria-hidden="true" /> : <RotateCcw aria-hidden="true" />}
            {PROJECT_NEXT_LABEL[status]}
          </Button>
        )}
        {/* Started by hand but nothing ticked yet: a quiet way back. Once a step is ticked, the ticks decide. */}
        {steps.length > 0 && done === 0 && status === 'doing' && (
          <Button variant="outline" onClick={() => set('todo')}><RotateCcw aria-hidden="true" />{t.topics.project.unstart}</Button>
        )}
      </div>
      {editing && <ProjectSheet open onOpenChange={setEditing} topic={topic} project={p} />}
      <ConfirmSheet open={deleting} onOpenChange={setDeleting} title={t.topics.page.deleteProject(p.code, p.name)} description={t.common.cantUndo}
        onConfirm={onDelete} />
    </div>
  )
}
