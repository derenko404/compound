// Renders topic content (skills, resources, projects) with cross links.
import { Fragment, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useLocation } from '@tanstack/react-router'
import { BookOpen, ChevronDown, ExternalLink, FileText, GraduationCap, Headphones, Hammer, Newspaper, PlayCircle, Wrench, Link2 } from 'lucide-react'
import { RESOURCE_KINDS, topicOf } from '@/core/domain/content'
import { hostOf } from '@/core/domain/finds'
import type { Topic, TopicId, Project, ProjectStatus, Resource, ResourceKind, Skill } from '@/core/domain/types'
import { useStore } from '@/store/StoreProvider'
import { burst, celebrate } from '@/fx/fx'
import { playTick, playUntick } from '@/fx/sound'
import { Check, Fold, InnerLink, Row, cvar } from '@/components/kit'
import { RemoveButton } from '@/components/edit'
import { t } from '@/i18n'

interface LinkIndex {
  re: RegExp | null
  projects: Map<string, TopicId>
  resources: Map<string, { url: string; ch: TopicId }>
  numbered: TopicId[]
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const cache = new WeakMap<Topic[], LinkIndex>()

// Project codes, "Topic N" and resource titles (plus "(ACRONYM)" aliases) that text can mention.
function linkIndex(all: Topic[]): LinkIndex {
  const hit = cache.get(all)
  if (hit) return hit
  const live = all.filter((c) => !c.archived)
  const projects = new Map<string, TopicId>()
  const resources = new Map<string, { url: string; ch: TopicId }>()
  for (const c of live) {
    for (const p of c.projects) if (p.code && !projects.has(p.code)) projects.set(p.code, c.id)
    for (const r of c.resources) {
      if (!r.url) continue
      const names = [r.title.replace(/\s*\(.*?\)\s*/g, ' ').trim(), ...(r.title.match(/\(([A-Z]{2,6})\)/)?.slice(1) ?? [])]
      for (const n of names) if (n.length >= 4 && !resources.has(n)) resources.set(n, { url: r.url, ch: c.id })
    }
  }
  const numbered = live.filter((c) => c.kind === 'learn').sort((a, b) => a.position - b.position).map((c) => c.id)
  const alts = [
    ...[...projects.keys()].map((k) => `\\b${esc(k)}\\b`),
    numbered.length ? `\\bTopic [1-${Math.min(9, numbered.length)}]\\b` : '',
    ...[...resources.keys()].sort((a, b) => b.length - a.length).map((k) => `(?<![\\w-])${esc(k)}(?![\\w-])`),
  ].filter(Boolean)
  const idx = { re: alts.length ? new RegExp(`(${alts.join('|')})`, 'g') : null, projects, resources, numbered }
  cache.set(all, idx)
  return idx
}

export function Linkify({ text }: { text: string }) {
  const { state } = useStore()
  const ix = linkIndex(state.topics)
  if (!ix.re) return <>{text}</>
  const parts = text.split(ix.re)
  return (
    <>
      {parts.map((p, i) => {
        if (i % 2 === 0 || !p) return <Fragment key={i}>{p}</Fragment>
        const pch = ix.projects.get(p)
        if (pch) return <InnerLink key={i} ch={pch} to="/topics/$ch" params={{ ch: pch }} hash={p}>{p}</InnerLink>
        const m = /^Topic ([1-9])$/.exec(p)
        const nch = m ? ix.numbered[Number(m[1]) - 1] : undefined
        if (nch) return <InnerLink key={i} ch={nch} to="/topics/$ch" params={{ ch: nch }}>{p}</InnerLink>
        const r = ix.resources.get(p)
        if (r) return <a key={i} href={r.url} target="_blank" rel="noopener" className="xref-res" style={cvar(r.ch)}>{p}</a>
        return <Fragment key={i}>{p}</Fragment>
      })}
    </>
  )
}

// A topic label linking to that topic's page.
export function TopicTag({ ch, label }: { ch: TopicId | null | undefined; label?: string }) {
  const { state } = useStore()
  const c = topicOf(state, ch)
  if (!c) return <>{label ?? ''}</>
  return <InnerLink ch={c.id} to="/topics/$ch" params={{ ch: c.id }}>{label ?? c.name}</InnerLink>
}

const KIND_ICON: Record<ResourceKind, typeof BookOpen> = {
  book: BookOpen, course: GraduationCap, video: PlayCircle, article: Newspaper, tool: Wrench,
  doc: FileText, practice: Hammer, podcast: Headphones, other: Link2,
}

// Step and resource ticks live in the same progress table as plan tasks, under their item ids.
export function useTick() {
  const { state, dispatch } = useStore()
  return {
    on: (id: string) => !!state.plan[id],
    set: (id: string, on: boolean) => {
      dispatch({ type: 'plan', taskId: id, doneAt: on ? new Date().toISOString() : null })
    },
  }
}

// A resource: tick, the title as a link with ↗, and one quiet line with the note, the site and whether it's free.
// No type icon: the list is already grouped by type.
// onEdit: edit mode, where the row opens its form and the title isn't a link.
function ResourceRow({ ch, r, onEdit, onRemove, readOnly }: { ch?: TopicId; r: Resource; onEdit?: (r: Resource) => void; onRemove?: (r: Resource) => void; readOnly?: boolean }) {
  const tick = useTick()
  const words = r.title.split(' ')
  const last = words.pop()
  return (
    <Row ch={ch} done={!readOnly && !onEdit && tick.on(r.id)} onOpen={onEdit && (() => onEdit(r))}
      check={onRemove ? <RemoveButton label={t.common.deleteNamed(r.title)} title={t.common.deleteAsk(r.title)} onConfirm={() => onRemove(r)} /> : readOnly || onEdit ? undefined : <Check on={tick.on(r.id)} label={r.title} onToggle={(v) => tick.set(r.id, v)} />}
      // The last word and the ↗ never split, so the icon can't wrap onto a line of its own.
      title={r.url && !onEdit ? <a href={r.url} target="_blank" rel="noopener" className="res-title">{words.length ? `${words.join(' ')} ` : ''}<span className="whitespace-nowrap">{last}<ExternalLink className="res-ext" aria-label={t.topics.resources.newTab} /></span></a> : r.title}
      // The note on its own line, then where it lives and whether it's free.
      sub={(r.note || r.url || r.free) ? (
        <>
          {r.note && <span className="block"><Linkify text={r.note} /></span>}
          {(r.url || r.free) && <span className="res-meta">{r.url && <span className="res-host">{hostOf(r.url)}</span>}{r.free && <span className="res-free">{t.topics.resources.free}</span>}</span>}
        </>
      ) : undefined}
    />
  )
}

// Resources grouped by type (books, courses, articles…).
// readOnly: no ticks (someone else's shared topic); ch can then be left out and the colour comes from around it.
export function ResourceGroups({ ch, resources, onEdit, onRemove, readOnly }: { ch?: TopicId; resources: Resource[]; onEdit?: (r: Resource) => void; onRemove?: (r: Resource) => void; readOnly?: boolean }) {
  const tick = useTick()
  const groups = RESOURCE_KINDS.map((k) => ({ ...k, items: resources.filter((r) => (r.kind ?? 'other') === k.id) })).filter((g) => g.items.length)
  return (
    <div className="grid gap-3">
      {groups.map((g, gi) => {
        const done = g.items.filter((r) => tick.on(r.id)).length
        const Icon = KIND_ICON[g.id]
        return (
          <Fold key={g.id} ch={ch} open={gi === 0 || !!onEdit} icon={<Icon className="res-icon" aria-hidden="true" />} title={t.topics.resourceKinds[g.id]} meta={readOnly ? g.items.length : `${done}/${g.items.length}`}>
            {g.items.map((r) => <ResourceRow key={r.id} ch={ch} r={r} onEdit={onEdit} onRemove={onRemove} readOnly={readOnly} />)}
          </Fold>
        )
      })}
    </div>
  )
}

// Skills as folds: intro and steps in order, each tickable. The skill you're on starts open, marked "now".
// readOnly: no ticks (someone else's shared topic).
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

export function Bullets({ items }: { items: string[] }) {
  return <ul className="bullets">{items.map((t, i) => <li key={i}><Linkify text={t} /></li>)}</ul>
}

export function Prose({ children }: { children: ReactNode }) {
  return <div className="panel prose-panel">{children}</div>
}

