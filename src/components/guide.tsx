// Renders chapter content (resources, checklists, projects) with cross links.
import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { BookOpen, ChevronDown, ExternalLink, FileText, GraduationCap, Headphones, Hammer, Newspaper, PlayCircle, Wrench, Link2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { RESOURCE_KINDS, chapterOf } from '@/lib/content'
import type { Chapter, ChapterId, Checklist, Project, ProjectStatus, Resource, ResourceKind } from '@/lib/types'
import { useStore } from '@/store/StoreProvider'
import { burst, praise, toast } from '@/fx/fx'
import { Check, Fold, Row, cvar } from '@/components/kit'
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
        if (pch) return <Link key={i} to="/chapters/$ch" params={{ ch: pch }} hash={p} className="xref" style={cvar(pch)}>{p}</Link>
        const m = /^Chapter ([1-9])$/.exec(p)
        const nch = m ? ix.numbered[Number(m[1]) - 1] : undefined
        if (nch) return <Link key={i} to="/chapters/$ch" params={{ ch: nch }} className="xref" style={cvar(nch)}>{p}</Link>
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
  return <Link to="/chapters/$ch" params={{ ch: c.id }} className="tag-link" style={cvar(c.id)}>{label ?? c.short}</Link>
}

const KIND_ICON: Record<ResourceKind, typeof BookOpen> = {
  book: BookOpen, course: GraduationCap, video: PlayCircle, article: Newspaper, tool: Wrench,
  doc: FileText, practice: Hammer, podcast: Headphones, other: Link2,
}

// Checklist and resource ticks live in the same progress table as plan tasks, under their item ids.
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
  remove: (item: T) => void
  move?: (item: T, d: -1 | 1) => void
}

function ResourceRow({ ch, r, editing }: { ch: ChapterId; r: Resource; editing?: ItemEdit<Resource> }) {
  const tick = useTick()
  const Icon = KIND_ICON[r.kind] ?? Link2
  return (
    <Row ch={ch} done={tick.on(r.id)}
      check={<Check on={tick.on(r.id)} label={r.title} onToggle={(v) => tick.set(r.id, v)} />}
      title={r.url
        ? <a href={r.url} target="_blank" rel="noopener" className="res-link"><Icon className="res-icon" aria-hidden="true" />{r.title}<ExternalLink className="size-(--icon-sm) opacity-60" aria-hidden="true" /></a>
        : <span className="res-link"><Icon className="res-icon" aria-hidden="true" />{r.title}</span>}
      sub={r.note || r.topic ? <>{r.note && <Linkify text={r.note} />}{r.note && r.topic ? ' · ' : ''}{r.topic && <span className="opacity-75">{r.topic}</span>}</> : undefined}
      tag={editing
        ? <RowEdit label={r.title} onEdit={() => editing.edit(r)} onDelete={() => editing.remove(r)} />
        : r.free ? <Badge variant="outline">Free</Badge> : undefined}
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

export function Checklists({ ch, lists, editing }: { ch: ChapterId; lists: Checklist[]; editing?: ItemEdit<Checklist> }) {
  const tick = useTick()
  return (
    <div className="grid gap-3">
      {lists.map((l) => {
        const done = l.items.filter((i) => tick.on(i.id)).length
        return (
          <Fold key={l.id} ch={ch} title={l.title} meta={editing
            // Controls inside the summary mustn't toggle the fold.
            ? <span onClick={(e) => e.preventDefault()}><RowEdit label={l.title} onEdit={() => editing.edit(l)} onDelete={() => editing.remove(l)}
                onUp={editing.move && (() => editing.move!(l, -1))} onDown={editing.move && (() => editing.move!(l, 1))} /></span>
            : `${done}/${l.items.length}`}>
            {l.items.map((it) => (
              <Row key={it.id} ch={ch} done={tick.on(it.id)} title={<span className="font-normal"><Linkify text={it.text} /></span>}
                check={<Check on={tick.on(it.id)} label={it.text} onToggle={(v) => tick.set(it.id, v)} />} />
            ))}
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
  const hasBody = !!(p.goal || p.steps?.length || p.done || p.trains || p.size)

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
          ? <RowEdit label={p.name} onEdit={() => editing.edit(p)} onDelete={() => editing.remove(p)}
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
            {p.trains && <><dt>Trains</dt><dd>{p.trains}</dd></>}
            {p.size && <><dt>Size</dt><dd>{p.size}</dd></>}
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

