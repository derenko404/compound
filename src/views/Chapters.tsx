import { useState } from 'react'
import { Link, getRouteApi } from '@tanstack/react-router'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { CH, CH_ORDER, PROJECTS, QUARTERS, TASKS } from '@/data/plan'
import { GUIDES } from '@/data/guides'
import { hostOf, kindName } from '@/lib/finds'
import type { ChapterId } from '@/lib/types'
import { useStore } from '@/store/StoreProvider'
import { Check, Header, Row, Section, cvar, useDebounced } from '@/components/kit'
import { Bullets, Checklists, Linkify, ProjectCard, ResourceGroups, resId } from '@/components/guide'
import { usePlanToggle } from './Plan'

const route = getRouteApi('/chapters/$ch')

export function Chapters() {
  const { ch: raw } = route.useParams()
  const ch = (CH_ORDER.includes(raw as ChapterId) ? raw : 'tech') as ChapterId
  return <ChapterPage key={ch} ch={ch} />
}

function ChapterPage({ ch }: { ch: ChapterId }) {
  const { state, dispatch } = useStore()
  const toggle = usePlanToggle()
  const [noteState, setNoteState] = useState('Saves as you type')
  const guide = GUIDES[ch]
  const ts = TASKS.filter((t) => t.ch === ch)
  const d = ts.filter((t) => state.plan[t.id]).length
  const resources = guide?.groups.flatMap((g) => g.items) ?? []
  const resDone = resources.filter((r) => state.plan[resId(ch, r)]).length
  const focusQs = QUARTERS.filter((q) => q.focus === ch).map((q) => `Q${q.q}`)
  // The doc's "Plan: 18 months" checklist is the same as the plan tasks above, so it's not repeated.
  const lists = guide?.checklists?.filter((l) => !l.title.startsWith('Plan')) ?? []
  const finds = state.bookmarks.filter((b) => b.chapter === ch)
  const saveNote = useDebounced((body: string) => {
    dispatch({ type: 'chapterNote', chapter: ch, body })
    setNoteState('Saved')
  })

  return (
    <>
      <Header title={CH[ch].name} lead={guide?.why ? <Linkify text={guide.why} /> : undefined} />
      <div className="chips">
        {CH_ORDER.map((c) => (
          <Link key={c} to="/chapters/$ch" params={{ ch: c }} className="chbtn text-foreground no-underline" style={cvar(c)} aria-pressed={ch === c}>
            <span className="dot" />{CH[c].short}
          </Link>
        ))}
      </div>

      <div className="stats" style={cvar(ch)}>
        <div className="stat"><b>{d}/{ts.length}</b><span>plan tasks</span></div>
        <div className="stat"><b>{resDone}/{resources.length}</b><span>resources</span></div>
        <div className="stat"><b>{focusQs.length ? focusQs.join(', ') : 'Light'}</b><span>{focusQs.length ? 'focus quarters' : 'track all year'}</span></div>
      </div>

      {guide?.outcomes && (
        <Section title="Where you'll be in 18 months">
          <div className="panel" style={cvar(ch)}><Bullets items={guide.outcomes} /></div>
        </Section>
      )}

      <Section title="Plan tasks" aside={<Link to="/plan">See all quarters</Link>}>
        <div className="list">
          {ts.map((t) => (
            <Row key={t.id} ch={t.ch} done={!!state.plan[t.id]} title={<Linkify text={t.text} />} tag={`Q${t.q}${t.m !== null ? `.${t.m + 1}` : ''}`}
              check={<Check on={!!state.plan[t.id]} label={t.text} onToggle={(on) => toggle(t.id, on)} />} />
          ))}
        </div>
      </Section>

      <Section title="Projects" aside="Tap a project for details">
        <div className="list">
          {PROJECTS.filter((p) => p.ch === ch).map((p) => <ProjectCard key={p.id} id={p.id} />)}
        </div>
      </Section>

      {guide && guide.groups.length > 0 && (
        <Section title="Resources" aside="Tick what you've finished">
          <ResourceGroups ch={ch} groups={guide.groups} />
        </Section>
      )}

      {finds.length > 0 && (
        <Section title="Your finds" aside={<Link to="/finds">All finds</Link>}>
          <div className="list">
            {finds.map((b) => (
              <Row key={b.id} ch={ch} title={<a href={b.url} target="_blank" rel="noreferrer" className="text-foreground">{b.title || hostOf(b.url)}</a>}
                sub={b.note || b.tags.map((t) => `#${t}`).join(' ') || undefined} tag={`${kindName(b.kind)} · ${hostOf(b.url)}`} />
            ))}
          </div>
        </Section>
      )}

      {lists.length > 0 && (
        <Section title="Checklists">
          <Checklists ch={ch} lists={lists} />
        </Section>
      )}

      {guide?.tips && guide.tips.length > 0 && (
        <Section title="Tips">
          <div className="panel" style={cvar(ch)}><Bullets items={guide.tips} /></div>
        </Section>
      )}

      <Section title="Chapter notes" aside={noteState}>
        <div className="panel">
          <div className="field">
            <Label htmlFor={`cnote-${ch}`}>What you learned, links, ideas</Label>
            <Textarea id={`cnote-${ch}`} rows={6} className="bg-background" defaultValue={state.chapterNotes[ch] ?? ''} onChange={(e) => {
              setNoteState('Typing…')
              saveNote(e.target.value)
            }} />
          </div>
        </div>
      </Section>
    </>
  )
}
