// Renders the roadmap doc content (src/data/guides.ts) natively, with cross links.
import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { BookOpen, ChevronDown, ExternalLink, FileText, GraduationCap, Headphones, Hammer, Newspaper, PlayCircle, Wrench, Link2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { CH, CH_ORDER, PROJECTS } from '@/data/plan'
import { GUIDES, PROJECT_DETAILS, type Checklist, type Resource, type ResourceGroup, type ResourceKind } from '@/data/guides'
import type { ChapterId, ProjectStatus } from '@/lib/types'
import { useStore } from '@/store/StoreProvider'
import { burst, praise, toast } from '@/fx/fx'
import { Check, Row, cvar } from '@/components/kit'

const PROJECT_IDS = new Set(PROJECTS.map((p) => p.id))
const projectChapter = (id: string) => PROJECTS.find((p) => p.id === id)!.ch

// Resource titles (and "(ACRONYM)" aliases) that other text can mention, longest first.
const RESOURCE_INDEX = (() => {
  const m = new Map<string, { url: string; ch: ChapterId }>()
  for (const [ch, g] of Object.entries(GUIDES) as [ChapterId, (typeof GUIDES)[ChapterId]][])
    for (const r of g?.groups.flatMap((x) => x.items) ?? []) {
      if (!r.url) continue
      const names = [r.title.replace(/\s*\(.*?\)\s*/g, ' ').trim(), ...(r.title.match(/\(([A-Z]{2,6})\)/)?.slice(1) ?? [])]
      for (const n of names) if (n.length >= 4 && !m.has(n)) m.set(n, { url: r.url, ch })
    }
  return m
})()
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const LINK_RE = new RegExp(
  `(\\b[TPMBEF][1-6]\\b|\\bChapter [1-6]\\b|${[...RESOURCE_INDEX.keys()].sort((a, b) => b.length - a.length).map((k) => `(?<![\\w-])${esc(k)}(?![\\w-])`).join('|')})`,
  'g',
)

// Turns project codes (T1…), "Chapter N" and resource titles named in text into links.
export function Linkify({ text }: { text: string }) {
  const parts = text.split(LINK_RE)
  return (
    <>
      {parts.map((p, i) => {
        if (i % 2 === 0 || !p) return <Fragment key={i}>{p}</Fragment>
        if (PROJECT_IDS.has(p)) {
          const ch = projectChapter(p)
          return <Link key={i} to="/chapters/$ch" params={{ ch }} hash={p} className="xref" style={cvar(ch)}>{p}</Link>
        }
        const m = /^Chapter ([1-6])$/.exec(p)
        if (m) {
          const ch = CH_ORDER[Number(m[1]) - 1]
          return <Link key={i} to="/chapters/$ch" params={{ ch }} className="xref" style={cvar(ch)}>{p}</Link>
        }
        const r = RESOURCE_INDEX.get(p)
        if (r) return <a key={i} href={r.url} target="_blank" rel="noopener" className="xref-res" style={cvar(r.ch)}>{p}</a>
        return <Fragment key={i}>{p}</Fragment>
      })}
    </>
  )
}

// A task's chapter label, linking to that chapter's page.
export function ChapterTag({ ch, label }: { ch: ChapterId; label?: string }) {
  if (!CH_ORDER.includes(ch)) return <>{label ?? CH[ch]?.short}</>
  return <Link to="/chapters/$ch" params={{ ch }} className="tag-link" style={cvar(ch)}>{label ?? CH[ch].short}</Link>
}

const KIND_ICON: Record<ResourceKind, typeof BookOpen> = {
  book: BookOpen, course: GraduationCap, video: PlayCircle, article: Newspaper, tool: Wrench,
  doc: FileText, practice: Hammer, podcast: Headphones, other: Link2,
}

// Checklist and resource ticks live in the same progress table as plan tasks, under prefixed ids.
function useTick() {
  const { state, dispatch } = useStore()
  return {
    on: (id: string) => !!state.plan[id],
    set: (id: string, on: boolean) => {
      dispatch({ type: 'plan', taskId: id, doneAt: on ? new Date().toISOString() : null })
      if (on) toast(praise())
    },
  }
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60)
export const resId = (ch: ChapterId, r: Resource) => `res:${ch}:${slug(r.url ?? r.title)}`

function ResourceRow({ ch, r }: { ch: ChapterId; r: Resource }) {
  const tick = useTick()
  const id = resId(ch, r)
  const Icon = KIND_ICON[r.kind ?? 'other']
  return (
    <Row ch={ch} done={tick.on(id)}
      check={<Check on={tick.on(id)} label={r.title} onToggle={(v) => tick.set(id, v)} />}
      title={r.url
        ? <a href={r.url} target="_blank" rel="noopener" className="res-link"><Icon className="res-icon" aria-hidden="true" />{r.title}<ExternalLink className="size-3.5 opacity-60" aria-hidden="true" /></a>
        : <span className="res-link"><Icon className="res-icon" aria-hidden="true" />{r.title}</span>}
      sub={r.note ? <Linkify text={r.note} /> : undefined}
      tag={r.free ? <Badge variant="outline">Free</Badge> : r.kind}
    />
  )
}

export function ResourceGroups({ ch, groups }: { ch: ChapterId; groups: ResourceGroup[] }) {
  const tick = useTick()
  return (
    <div className="grid gap-3">
      {groups.map((g, gi) => {
        const done = g.items.filter((r) => tick.on(resId(ch, r))).length
        return (
          <details key={g.title} className="fold" open={gi === 0} style={cvar(ch)}>
            <summary>
              <span className="fold-title">{g.title}</span>
              <span className="fold-meta">{done}/{g.items.length}</span>
              <ChevronDown className="fold-chev" aria-hidden="true" />
            </summary>
            {g.intro && <p className="fold-intro"><Linkify text={g.intro} /></p>}
            <div className="fold-body">{g.items.map((r, i) => <ResourceRow key={i} ch={ch} r={r} />)}</div>
          </details>
        )
      })}
    </div>
  )
}

export function Checklists({ ch, lists }: { ch: ChapterId; lists: Checklist[] }) {
  const tick = useTick()
  return (
    <div className="grid gap-3">
      {lists.map((l) => {
        const ids = l.items.map((_, i) => `chk:${ch}:${slug(l.title)}:${i}`)
        const done = ids.filter(tick.on).length
        return (
          <details key={l.title} className="fold" style={cvar(ch)}>
            <summary>
              <span className="fold-title">{l.title}</span>
              <span className="fold-meta">{done}/{l.items.length}</span>
              <ChevronDown className="fold-chev" aria-hidden="true" />
            </summary>
            <div className="fold-body">
              {l.items.map((it, i) => (
                <Row key={i} ch={ch} done={tick.on(ids[i])} title={<span className="font-normal"><Linkify text={it} /></span>}
                  check={<Check on={tick.on(ids[i])} label={it} onToggle={(v) => tick.set(ids[i], v)} />} />
              ))}
            </div>
          </details>
        )
      })}
    </div>
  )
}

const LABEL: Record<ProjectStatus, string> = { todo: 'Not started', doing: 'In progress', done: 'Done' }
const NEXT: Record<ProjectStatus, ProjectStatus> = { todo: 'doing', doing: 'done', done: 'todo' }

export function ProjectCard({ id }: { id: string }) {
  const { state, dispatch } = useStore()
  const { hash } = useLocation()
  const p = PROJECTS.find((x) => x.id === id)!
  const d = PROJECT_DETAILS[id]
  const sv = state.projects[id] ?? 'todo'
  const [open, setOpen] = useState(hash === id)
  const ref = useRef<HTMLDivElement>(null)

  // Arriving from a cross link (#T1) opens and reveals the card.
  useEffect(() => {
    if (hash !== id) return
    setOpen(true)
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    ref.current?.classList.add('flash')
  }, [hash, id])

  const [trains, size] = (d?.stack ?? '').split(' · ').map((s) => s.replace(/^(Trains|Size): /, ''))
  return (
    <div ref={ref} id={id} className="project" style={cvar(p.ch)}>
      <div className="project-head">
        <button className="project-code" aria-expanded={open} onClick={() => setOpen(!open)}>{id}</button>
        <button className="project-name" aria-expanded={open} onClick={() => setOpen(!open)}>
          {p.name}
          <ChevronDown className={`size-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>
        <button className={`status ${sv}`} aria-label={`${p.name}: ${LABEL[sv]}. Change status`} onClick={(e) => {
          const nx = NEXT[sv]
          dispatch({ type: 'project', projectId: id, status: nx })
          if (nx === 'done') {
            burst(e.currentTarget, 26)
            toast(`Project ${id} done.`)
          }
        }}>{LABEL[sv]}</button>
      </div>
      {open && d && (
        <div className="project-body">
          <p><Linkify text={d.goal} /></p>
          {d.steps && <ol>{d.steps.map((s, i) => <li key={i}><Linkify text={s} /></li>)}</ol>}
          <dl>
            {d.done && <><dt>Done when</dt><dd><Linkify text={d.done} /></dd></>}
            {trains && <><dt>Trains</dt><dd>{trains}</dd></>}
            {size && <><dt>Size</dt><dd>{size}</dd></>}
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
