// Renders track content (skills, resources, projects) with cross links.
import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react'
import { useLocation } from '@tanstack/react-router'
import { BookOpen, ChevronDown, ExternalLink, FileText, GraduationCap, Headphones, Hammer, Newspaper, PlayCircle, Wrench, Link2 } from 'lucide-react'
import { RESOURCE_KINDS, chapterOf, sizeLabel } from '@/lib/content'
import { hostOf } from '@/lib/finds'
import type { Chapter, ChapterId, Project, ProjectStatus, Resource, ResourceKind, Skill } from '@/lib/types'
import { useStore } from '@/store/StoreProvider'
import { burst, praise, toast } from '@/fx/fx'
import { Check, Fold, InnerLink, Row, cvar } from '@/components/kit'
import { RowEdit } from '@/components/edit'

interface LinkIndex {
  re: RegExp | null
  projects: Map<string, ChapterId>
  resources: Map<string, { url: string; ch: ChapterId }>
  numbered: ChapterId[]
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const cache = new WeakMap<Chapter[], LinkIndex>()

// Project codes, "Chapter N" and resource titles (plus "(ACRONYM)" aliases) that text can mention.
function linkIndex(all: Chapter[]): LinkIndex {
  const hit = cache.get(all)
  if (hit) return hit
  const live = all.filter((c) => !c.archived)
  const projects = new Map<string, ChapterId>()
  const resources = new Map<string, { url: string; ch: ChapterId }>()
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
    numbered.length ? `\\bChapter [1-${Math.min(9, numbered.length)}]\\b` : '',
    ...[...resources.keys()].sort((a, b) => b.length - a.length).map((k) => `(?<![\\w-])${esc(k)}(?![\\w-])`),
  ].filter(Boolean)
  const idx = { re: alts.length ? new RegExp(`(${alts.join('|')})`, 'g') : null, projects, resources, numbered }
  cache.set(all, idx)
  return idx
}

export function Linkify({ text }: { text: string }) {
  const { state } = useStore()
  const ix = linkIndex(state.chapters)
  if (!ix.re) return <>{text}</>
  const parts = text.split(ix.re)
  return (
    <>
      {parts.map((p, i) => {
        if (i % 2 === 0 || !p) return <Fragment key={i}>{p}</Fragment>
        const pch = ix.projects.get(p)
        if (pch) return <InnerLink key={i} ch={pch} to="/tracks/$ch" params={{ ch: pch }} hash={p}>{p}</InnerLink>
        const m = /^Chapter ([1-9])$/.exec(p)
        const nch = m ? ix.numbered[Number(m[1]) - 1] : undefined
        if (nch) return <InnerLink key={i} ch={nch} to="/tracks/$ch" params={{ ch: nch }}>{p}</InnerLink>
        const r = ix.resources.get(p)
        if (r) return <a key={i} href={r.url} target="_blank" rel="noopener" className="xref-res" style={cvar(r.ch)}>{p}</a>
        return <Fragment key={i}>{p}</Fragment>
      })}
    </>
  )
}

// A chapter label linking to that chapter's page.
export function ChapterTag({ ch, label }: { ch: ChapterId | null | undefined; label?: string }) {
  const { state } = useStore()
  const c = chapterOf(state, ch)
  if (!c) return <>{label ?? ''}</>
  return <InnerLink ch={c.id} to="/tracks/$ch" params={{ ch: c.id }}>{label ?? c.name}</InnerLink>
}

const KIND_ICON: Record<ResourceKind, typeof BookOpen> = {
  book: BookOpen, course: GraduationCap, video: PlayCircle, article: Newspaper, tool: Wrench,
  doc: FileText, practice: Hammer, podcast: Headphones, other: Link2,
}

// Topic and resource ticks live in the same progress table as plan tasks, under their item ids.
export function useTick() {
  const { state, dispatch } = useStore()
  return {
    on: (id: string) => !!state.plan[id],
    set: (id: string, on: boolean) => {
      dispatch({ type: 'plan', taskId: id, doneAt: on ? new Date().toISOString() : null })
      if (on) toast(praise())
    },
  }
}

export interface ItemEdit<T> {
  edit: (item: T) => void
  move?: (item: T, d: -1 | 1) => void
}

// A resource: tick, the title as a link with ↗, and one quiet line with the note, the site and whether it's free.
// No type icon: the list is already grouped by type.
function ResourceRow({ ch, r, editing }: { ch: ChapterId; r: Resource; editing?: ItemEdit<Resource> }) {
  const tick = useTick()
  const words = r.title.split(' ')
  const last = words.pop()
  return (
    <Row ch={ch} done={tick.on(r.id)}
      check={<Check on={tick.on(r.id)} label={r.title} onToggle={(v) => tick.set(r.id, v)} />}
      // The last word and the ↗ never split, so the icon can't wrap onto a line of its own.
      title={r.url ? <a href={r.url} target="_blank" rel="noopener" className="res-title">{words.length ? `${words.join(' ')} ` : ''}<span className="whitespace-nowrap">{last}<ExternalLink className="res-ext" aria-label="opens in a new tab" /></span></a> : r.title}
      // The note on its own line, then where it lives and whether it's free.
      sub={(r.note || r.url || r.free) ? (
        <>
          {r.note && <span className="block"><Linkify text={r.note} /></span>}
          {(r.url || r.free) && <span className="res-meta">{r.url && <span className="res-host">{hostOf(r.url)}</span>}{r.free && <span className="res-free">Free</span>}</span>}
        </>
      ) : undefined}
      tag={editing ? <RowEdit label={r.title} onEdit={() => editing.edit(r)} /> : undefined}
    />
  )
}

// Resources grouped by type (books, courses, articles…).
export function ResourceGroups({ ch, resources, editing }: { ch: ChapterId; resources: Resource[]; editing?: ItemEdit<Resource> }) {
  const tick = useTick()
  const groups = RESOURCE_KINDS.map((k) => ({ ...k, items: resources.filter((r) => (r.kind ?? 'other') === k.id) })).filter((g) => g.items.length)
  return (
    <div className="grid gap-3">
      {groups.map((g, gi) => {
        const done = g.items.filter((r) => tick.on(r.id)).length
        const Icon = KIND_ICON[g.id]
        return (
          <Fold key={g.id} ch={ch} open={gi === 0 || !!editing} icon={<Icon className="res-icon" aria-hidden="true" />} title={g.label} meta={`${done}/${g.items.length}`}>
            {g.items.map((r) => <ResourceRow key={r.id} ch={ch} r={r} editing={editing} />)}
          </Fold>
        )
      })}
    </div>
  )
}

// Skills as folds: intro and topics in order, each tickable. The skill you're on starts open, marked "now".
export function SkillFolds({ ch, skills, current, itemsLabel = 'Topics, in order', editing }: {
  ch: ChapterId; skills: Skill[]; current?: string; itemsLabel?: string; editing?: ItemEdit<Skill>
}) {
  const tick = useTick()
  return (
    <div className="grid gap-3">
      {skills.map((k) => {
        const done = k.topics.filter((t) => tick.on(t.id)).length
        return (
          <Fold key={k.id} ch={ch} open={k.id === current || undefined} title={k.id === current ? `${k.name}, now` : k.name} meta={editing
            // Controls inside the summary mustn't toggle the fold.
            ? <span onClick={(e) => e.preventDefault()}><RowEdit label={k.name} onEdit={() => editing.edit(k)}
                onUp={editing.move && (() => editing.move!(k, -1))} onDown={editing.move && (() => editing.move!(k, 1))} movable={!!editing.move} /></span>
            : `${done}/${k.topics.length}`}>
            {k.intro && <p className="fold-intro"><Linkify text={k.intro} /></p>}
            {k.topics.length > 0 && <div className="list-label">{itemsLabel}</div>}
            {k.topics.map((it) => (
              <Row key={it.id} ch={ch} done={tick.on(it.id)} title={<span className="font-normal"><Linkify text={it.text} /></span>}
                check={<Check on={tick.on(it.id)} label={it.text} onToggle={(v) => tick.set(it.id, v)} />} />
            ))}
            {!k.topics.length && <div className="empty">No topics yet.</div>}
          </Fold>
        )
      })}
    </div>
  )
}

const LABEL: Record<ProjectStatus, string> = { todo: 'Not started', doing: 'In progress', done: 'Done' }
const NEXT: Record<ProjectStatus, ProjectStatus> = { todo: 'doing', doing: 'done', done: 'todo' }

export function ProjectCard({ ch, p, editing }: { ch: ChapterId; p: Project; editing?: ItemEdit<Project> }) {
  const { state, dispatch } = useStore()
  const { hash } = useLocation()
  const sv = state.projects[p.id] ?? 'todo'
  const [open, setOpen] = useState(hash === p.code)
  const ref = useRef<HTMLDivElement>(null)
  const hasBody = !!(p.goal || p.steps?.length || p.done || p.trains?.length || p.size)

  // Arriving from a cross link (#T1) opens and reveals the card.
  useEffect(() => {
    if (!p.code || hash !== p.code) return
    setOpen(true)
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    ref.current?.classList.add('flash')
  }, [hash, p.code])

  return (
    <div ref={ref} id={p.code || p.id} className="project" style={cvar(ch)}>
      <div className="project-head">
        <button className="project-code" aria-expanded={open} onClick={() => setOpen(!open)}>{p.code || '•'}</button>
        <button className="project-name" aria-expanded={open} onClick={() => setOpen(!open)}>
          {p.name}
          {hasBody && <ChevronDown className="chev" style={open ? { transform: 'rotate(180deg)' } : undefined} aria-hidden="true" />}
        </button>
        {editing
          ? <RowEdit label={p.name} onEdit={() => editing.edit(p)}
              onUp={editing.move && (() => editing.move!(p, -1))} onDown={editing.move && (() => editing.move!(p, 1))} />
          : <button className={`status ${sv}`} aria-label={`${p.name}: ${LABEL[sv]}. Change status`} onClick={(e) => {
              const nx = NEXT[sv]
              dispatch({ type: 'project', projectId: p.id, status: nx })
              if (nx === 'done') {
                burst(e.currentTarget, 26)
                toast(`Project ${p.code || p.name} done.`)
              }
            }}>{LABEL[sv]}</button>}
      </div>
      {open && hasBody && (
        <div className="project-body">
          {p.goal && <p><Linkify text={p.goal} /></p>}
          {p.steps && p.steps.length > 0 && <ol>{p.steps.map((s, i) => <li key={i}><Linkify text={s} /></li>)}</ol>}
          <dl>
            {p.done && <><dt>Done when</dt><dd><Linkify text={p.done} /></dd></>}
            {p.trains?.length ? <><dt>Trains</dt><dd>{p.trains.join(', ')}</dd></> : null}
            {p.size && <><dt>Size</dt><dd>{sizeLabel(p.size)}</dd></>}
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

