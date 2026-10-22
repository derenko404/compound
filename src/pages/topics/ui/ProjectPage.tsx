import { useState } from 'react'
import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { Pencil, Trash2 } from 'lucide-react'
import { Check, ConfirmSheet, Header, List, Row, Section, Segmented, cvar, usePageBar } from '@/shared/ui'
import { topicOf } from '@core/domain/content'
import type { Project, Topic } from '@core/domain/types'
import { useStore } from '@/shared/store/StoreProvider'
import { t } from '@/shared/i18n'
import { Linkify, PROJECT_STATUSES, PROJECT_STATUS_LABEL, PROJECT_STATUS_TONE, ProjectSheet, useProjectStatus, useTick, useTopicSave } from '@/features/topics'

const route = getRouteApi('/topics/$ch/projects/$project')

/**
 * A project's own page, pushed from its topic's Projects tab (as iOS lists open a detail page): its status as a
 * segmented control, the goal, the steps to tick, and when it counts as done. Edit and Delete are in the ⋯ menu.
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
  // Under the name: its code as a chip, then what it trains and its size.
  const facts = [p.trains?.join(', '), p.size && t.topics.sizes[p.size].label].filter(Boolean).join(' · ')
  return (
    <div style={cvar(ch)}>
      <Header title={p.name} lead={p.goal ? <Linkify text={p.goal} /> : undefined}
        sub={(p.code || facts) && <span className="title-row">{p.code && <span className="project-code">{p.code}</span>}{facts}</span>} />
      <div className="page-control">
        <Segmented label={t.topics.project.statusLabel} value={status} onChange={set}
          options={PROJECT_STATUSES.map((v) => ({ value: v, label: PROJECT_STATUS_LABEL[v], color: PROJECT_STATUS_TONE[v] }))} />
      </div>
      {steps.length > 0 && (
        <Section group title={t.topics.form.steps} aside={`${done}/${steps.length}`}>
          {/* Ticked like a skill's steps; the one My day shows is the first still open. */}
          <List>
            {steps.map((x) => (
              <Row key={x.id} ch={ch} done={tick.on(x.id)} title={<span className="font-normal"><Linkify text={x.text} /></span>}
                check={<Check on={tick.on(x.id)} label={x.text} onToggle={(v) => tick.set(x.id, v)} />} />
            ))}
          </List>
        </Section>
      )}
      {p.done && (
        <Section group title={t.topics.project.doneWhen}>
          <List><p className="list-text"><Linkify text={p.done} /></p></List>
        </Section>
      )}
      {editing && <ProjectSheet open onOpenChange={setEditing} topic={topic} project={p} />}
      <ConfirmSheet open={deleting} onOpenChange={setDeleting} title={t.topics.page.deleteProject(p.code, p.name)} description={t.common.cantUndo}
        onConfirm={onDelete} />
    </div>
  )
}
