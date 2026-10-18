// Text with cross links: project codes, "Topic N" and resource titles.
import { Fragment } from 'react'
import type { Topic, TopicId } from '@core/domain/types'
import { useStore } from '@/shared/store/StoreProvider'
import { InnerLink, cvar } from '@/shared/ui'

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
