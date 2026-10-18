import { useState } from 'react'
import { Link, getRouteApi, useNavigate } from '@tanstack/react-router'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { KIND_LABEL, chapterOf, chapters, monthRange, program } from '@/lib/content'
import { programPos, quarterPlan, startDate } from '@/lib/derive'
import { fmtStamp } from '@/lib/dates'
import { hostOf, kindName } from '@/lib/finds'
import type { Chapter, ChapterKind, Checklist, PlanTask, Project, Resource } from '@/lib/types'
import { useStore } from '@/store/StoreProvider'
import { Banner, Check, Chip, ChipLink, Chips, Entry, Header, LinkCard, List, Panel, Row, Section, Stats, empty, useDebounced } from '@/components/kit'
import { EditToggle, PlusButton, RowEdit, move, useSheet } from '@/components/edit'
import { Bullets, Checklists, Linkify, ProjectCard, ResourceGroups } from '@/components/guide'
import { usePlanToggle } from './Plan'
import {
  ChapterSheet, ChecklistSheet, ComponentsSheet, ProjectSheet, ResourceSheet, TaskSheet,
  blankChecklist, blankProject, blankResource, blankTask, newChapter, useChapterSave,
} from './chapterForms'
import { Trackers } from './Health'

const route = getRouteApi('/chapters/$ch')

/* ---------- All chapters ---------- */

export function ChapterIndex() {
  const { state } = useStore()
  const sheet = useSheet<Chapter>()
  const nav = useNavigate()
  const groups: ChapterKind[] = ['learn', 'health', 'general']
  const start = startDate(state)

  return (
    <>
      <Header title="Chapters" lead="Each chapter holds its plan tasks, projects, resources, checklists and tips. Add your own or edit any of them.">
        <PlusButton label="New chapter" onClick={() => sheet.open(newChapter('learn', state.chapters, program(state).months))} />
      </Header>
      {groups.map((k) => {
        const cs = chapters(state, k)
        if (!cs.length) return null
        return (
          <Section key={k} title={k === 'learn' ? 'Roadmap' : KIND_LABEL[k]}>
            <div className="card-grid">
              {cs.map((c) => {
                const done = c.tasks.filter((t) => state.plan[t.id]).length
                return (
                  <LinkCard key={c.id} to="/chapters/$ch" params={{ ch: c.id }} ch={c.id} title={c.name}
                    sub={c.kind === 'learn' ? `${monthRange(start, c.start, c.start + c.months - 1)} · ${done}/${c.tasks.length} tasks` : `${c.resources.length} resources · ${c.checklists.length} checklists`} />
                )
              })}
            </div>
          </Section>
        )
      })}
      {sheet.value && <ChapterSheet {...sheet.props} chapter={sheet.value} onSaved={(c) => nav({ to: '/chapters/$ch', params: { ch: c.id } })} />}
    </>
  )
}

/* ---------- One chapter ---------- */

export function Chapters() {
  const { ch } = route.useParams()
  const { state } = useStore()
  const c = chapterOf(state, ch)
  if (!c) return empty('This chapter no longer exists.')
  return <ChapterPage key={c.id} c={c} />
}

type Editing =
  | { kind: 'chapter' } | { kind: 'components' }
  | { kind: 'task'; v: PlanTask } | { kind: 'project'; v: Project } | { kind: 'resource'; v: Resource } | { kind: 'checklist'; v: Checklist }

function ChapterPage({ c }: { c: Chapter }) {
  const { state, dispatch } = useStore()
  const save = useChapterSave()
  const toggle = usePlanToggle()
  // A fresh chapter opens in edit mode, ready to fill.
  const [edit, setEdit] = useState(!c.tasks.length && !c.projects.length && !c.resources.length && !c.checklists.length)
  const sheet = useSheet<Editing>()
  const [noteState, setNoteState] = useState('Saves as you type')
  const pos = programPos(state, new Date())
  const start = startDate(state)
  const done = c.tasks.filter((t) => state.plan[t.id]).length
  const resDone = c.resources.filter((r) => state.plan[r.id]).length
  const focusQs = program(state).quarters.map((_, i) => i + 1).filter((q) => quarterPlan(state, q).focus === c.id).map((q) => `Q${q}`)
  const finds = state.bookmarks.filter((b) => b.chapter === c.id)
  const notes = state.notes.filter((n) => n.chapter === c.id)
  const saveNote = useDebounced((body: string) => {
    dispatch({ type: 'chapterNote', chapter: c.id, body })
    setNoteState('Saved')
  })
  const plus = (label: string, e: Editing) => (edit ? <PlusButton label={label} onClick={() => sheet.open(e)} /> : undefined)
  const moveIn = <K extends 'projects' | 'checklists'>(key: K) => (item: Chapter[K][number], d: -1 | 1) => {
    const xs = c[key] as { id: string }[]
    save({ ...c, [key]: move(xs, xs.findIndex((x) => x.id === item.id), d) })
  }
  const removeFrom = <K extends 'projects' | 'resources' | 'checklists'>(key: K) => (item: { id: string }) =>
    save({ ...c, [key]: (c[key] as { id: string }[]).filter((x) => x.id !== item.id) })

  return (
    <>
      <Header title={c.name} lead={c.description ? <Linkify text={c.description} /> : undefined}>
        <EditToggle on={edit} onChange={setEdit} />
      </Header>
      <Chips>
        <ChipLink to="/chapters">All</ChipLink>
        {chapters(state, c.kind).map((x) => (
          <ChipLink key={x.id} to="/chapters/$ch" params={{ ch: x.id }} ch={x.id} pressed={x.id === c.id}>{x.name}</ChipLink>
        ))}
      </Chips>

      {edit && (
        <Banner ch={c.id} actions={<>
          <Chip onClick={() => sheet.open({ kind: 'chapter' })}>Name, dates, outcomes, tips</Chip>
          <Chip onClick={() => sheet.open({ kind: 'components' })}>Trackers</Chip>
        </>}>
          Editing. Use + to add, the pencil to change, the bin to remove.
        </Banner>
      )}

      <Stats ch={c.id} items={[
        { value: `${done}/${c.tasks.length}`, label: 'plan tasks' },
        { value: `${resDone}/${c.resources.length}`, label: 'resources' },
        { value: focusQs.length ? focusQs.join(', ') : monthRange(start, c.start, c.start + c.months - 1), label: focusQs.length ? 'focus quarters' : 'runs' },
      ]} />

      {c.components && Object.keys(c.components).length > 0 && <Section title="Trackers"><Trackers c={c} /></Section>}

      {c.outcomes.length > 0 && (
        <Section title={`Where you'll be in ${c.months} month${c.months === 1 ? '' : 's'}`}>
          <Panel ch={c.id}><Bullets items={c.outcomes} /></Panel>
        </Section>
      )}

      {(c.tasks.length > 0 || edit) && (
        <Section title="Plan tasks" aside={plus('New plan task', { kind: 'task', v: blankTask(Math.max(c.start, pos.m)) }) ?? <Link to="/plan">See the plan</Link>}>
          <List empty="No tasks yet. Add one with +.">
            {c.tasks.map((t) => (
              <Row key={t.id} ch={c.id} done={!!state.plan[t.id]} title={<Linkify text={t.text} />}
                tag={edit
                  ? <RowEdit label="task" onEdit={() => sheet.open({ kind: 'task', v: t })} onDelete={() => save({ ...c, tasks: c.tasks.filter((x) => x.id !== t.id) })} />
                  : monthRange(start, t.from, t.to)}
                check={<Check on={!!state.plan[t.id]} label={t.text} onToggle={(on) => toggle(t.id, on)} />} />
            ))}
          </List>
        </Section>
      )}

      {(c.projects.length > 0 || edit) && (
        <Section title="Projects" aside={plus('New project', { kind: 'project', v: blankProject() }) ?? 'Tap a project for details'}>
          <List empty="No projects yet.">
            {c.projects.map((p) => (
              <ProjectCard key={p.id} ch={c.id} p={p}
                editing={edit ? { edit: (v) => sheet.open({ kind: 'project', v }), remove: removeFrom('projects'), move: moveIn('projects') } : undefined} />
            ))}
          </List>
        </Section>
      )}

      {(c.resources.length > 0 || edit) && (
        <Section title="Resources" aside={plus('New resource', { kind: 'resource', v: blankResource() }) ?? "Tick what you've finished"}>
          {c.resources.length
            ? <ResourceGroups ch={c.id} resources={c.resources} editing={edit ? { edit: (v) => sheet.open({ kind: 'resource', v }), remove: removeFrom('resources') } : undefined} />
            : <List empty="No resources yet." />}
        </Section>
      )}

      {(c.checklists.length > 0 || edit) && (
        <Section title="Checklists" aside={plus('New checklist', { kind: 'checklist', v: blankChecklist() })}>
          {c.checklists.length
            ? <Checklists ch={c.id} lists={c.checklists} editing={edit ? { edit: (v) => sheet.open({ kind: 'checklist', v }), remove: removeFrom('checklists'), move: moveIn('checklists') } : undefined} />
            : <List empty="No checklists yet." />}
        </Section>
      )}

      {c.tips.length > 0 && (
        <Section title="Tips">
          <Panel ch={c.id}><Bullets items={c.tips} /></Panel>
        </Section>
      )}

      <Section title="Chapter notes" aside={noteState}>
        <Panel>
          <div className="field">
            <Label htmlFor={`cnote-${c.id}`}>What you learned, links, ideas</Label>
            <Textarea id={`cnote-${c.id}`} rows={6} defaultValue={state.chapterNotes[c.id] ?? ''} onChange={(e) => {
              setNoteState('Typing…')
              saveNote(e.target.value)
            }} />
          </div>
        </Panel>
      </Section>

      {notes.length > 0 && (
        <Section title="Notes" aside={<Link to="/notes">All notes</Link>}>
          <List>
            {notes.map((n) => (
              <Entry key={n.id} ch={c.id} meta={fmtStamp(n.created_at)}><div className="note-text">{n.body}</div></Entry>
            ))}
          </List>
        </Section>
      )}

      {finds.length > 0 && (
        <Section title="Your finds" aside={<Link to="/finds">All finds</Link>}>
          <List>
            {finds.map((b) => (
              <Row key={b.id} ch={c.id} title={<a href={b.url} target="_blank" rel="noreferrer" className="text-foreground">{b.title || hostOf(b.url)}</a>}
                sub={b.note || b.tags.map((t) => `#${t}`).join(' ') || undefined} tag={`${kindName(b.kind)} · ${hostOf(b.url)}`} />
            ))}
          </List>
        </Section>
      )}

      {sheet.value?.kind === 'chapter' && <ChapterSheet {...sheet.props} chapter={c} />}
      {sheet.value?.kind === 'components' && <ComponentsSheet {...sheet.props} chapter={c} />}
      {sheet.value?.kind === 'task' && <TaskSheet {...sheet.props} chapter={c} task={sheet.value.v} />}
      {sheet.value?.kind === 'project' && <ProjectSheet {...sheet.props} chapter={c} project={sheet.value.v} />}
      {sheet.value?.kind === 'resource' && <ResourceSheet {...sheet.props} chapter={c} resource={sheet.value.v} />}
      {sheet.value?.kind === 'checklist' && <ChecklistSheet {...sheet.props} chapter={c} list={sheet.value.v} />}
    </>
  )
}
