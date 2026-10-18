import { useRef, useState } from 'react'
import { Link, getRouteApi, useLocation, useNavigate } from '@tanstack/react-router'
import { Crosshair, Info, Pencil, Share2, Trash2 } from 'lucide-react'
import { usePageBar } from '@/components/bar'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { RESOURCE_KINDS, chapterOf, chapters, program, trackSnapshot } from '@/lib/content'
import { ShareSheet } from '@/components/share'
import { focusOf, monthName, targetFinish, nextUp, pace, trackProgress } from '@/lib/derive'
import type { Chapter, Note, Project, Resource, ResourceKind, Skill } from '@/lib/types'
import { useNoteCount, useNotes, useStore } from '@/store/StoreProvider'
import { lockOn, toast } from '@/fx/fx'
import { playFocus } from '@/fx/sound'
import {
  Chip, ChipsList, Header, List, Meter, SearchField, Section, Tabs, cvar, empty,
} from '@/components/kit'
import { ConfirmSheet, PlusButton, move, useSheet } from '@/components/edit'
import { Bullets, Linkify, ProjectCard, ResourceGroups, SkillFolds } from '@/components/guide'
import { NoteCard, NoteSheet, useLoadMore } from './Notebook'
import {
  ChapterSheet, SkillSheet, ProjectSheet, ResourceSheet,
  blankSkill, blankProject, blankResource, newChapter, useChapterSave,
} from './chapterForms'

const route = getRouteApi('/tracks/$ch')

/* ---------- All chapters ---------- */

// One track on the index: topics done, its focus quarters, and what's next.
function ChapterCard({ c }: { c: Chapter }) {
  const { state } = useStore()
  const { done, total } = trackProgress(state, c)
  const focus = focusOf(state) === c.id
  const next = nextUp(state, c)
  // Pace only when there is some: topics a week over the last 4 weeks, and when that finishes the track.
  const { perWeek, left, finish } = pace(state, c, new Date())
  const end = targetFinish(c)
  const late = !!finish && !!end && finish > end
  const paceLine = perWeek && left && finish
    ? `${perWeek % 1 ? perWeek.toFixed(1) : perWeek} topics a week, done around ${finish.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}${late ? `, after your ${monthName(end!)} target` : ''}`
    : null
  return (
    <Link to="/tracks/$ch" params={{ ch: c.id }} className={`chapter-card${focus ? ' is-focus' : ''}`} style={cvar(c.id)}>
      <div className="chapter-card-head">
        <span className="focus-name"><span className="dot" />{c.name}</span>
        {/* One track is the focus (heavy): it gets the study sessions and the weekend project. Set from the track's ⋯ menu. */}
        {focus && <span className="focus-badge"><Crosshair aria-hidden="true" />Focus</span>}
      </div>
      {total > 0 ? (
        <>
          <div className="chapter-card-progress"><Meter value={done / total} label={`${done} of ${total} topics`} /><span>{done} of {total}</span></div>
          {next?.topic && <div className="chapter-card-now"><span className="focus-label">Next topic in {next.skill.name}</span>{next.topic.text}</div>}
          {paceLine && <div className={`track-row-pace${late ? ' late' : ''}`}>{paceLine}</div>}
        </>
      ) : (
        <div className="muted text-small">{c.skills.length} skills, {c.resources.length} resources</div>
      )}
    </Link>
  )
}

export function ChapterIndex() {
  const { state } = useStore()
  const sheet = useSheet<Chapter>()
  const nav = useNavigate()
  // The focus track when the page opened leads. Switching focus during the visit moves nothing,
  // like ticks with useDoneLastOnOpen; the next visit shows the new order.
  const [lead] = useState(() => focusOf(state))
  const roadmap = chapters(state, 'learn').sort((a, b) => Number(b.id === lead) - Number(a.id === lead))
  // Personal, the default track, sits apart under Other.
  const other = chapters(state, 'general')

  return (
    <>
      <Header title="Tracks" lead="Your roadmap, one track per skill area, all running in parallel.">
        <PlusButton label="New track" onClick={() => sheet.open(newChapter('learn', state.chapters))} />
      </Header>
      <Section title="Your tracks">
        <div className="card-grid">{roadmap.map((c) => <ChapterCard key={c.id} c={c} />)}</div>
      </Section>
      {other.length > 0 && (
        <Section title="Other">
          <div className="card-grid">{other.map((c) => <ChapterCard key={c.id} c={c} />)}</div>
        </Section>
      )}
      {sheet.value && <ChapterSheet {...sheet.props} chapter={sheet.value} onSaved={(c) => nav({ to: '/tracks/$ch', params: { ch: c.id } })} />}
    </>
  )
}

/* ---------- One chapter ---------- */

export function Chapters() {
  const { ch } = route.useParams()
  const { state } = useStore()
  const c = chapterOf(state, ch)
  if (!c) return empty('This track no longer exists.')
  return <ChapterPage key={c.id} c={c} />
}

type Editing =
  | { kind: 'chapter' }
  | { kind: 'project'; v: Project } | { kind: 'resource'; v: Resource } | { kind: 'skill'; v: Skill }

// Read-only: what the track is about, where it leads, and the skills it builds.
function AboutSheet({ c, open, onOpenChange }: { c: Chapter; open: boolean; onOpenChange: (o: boolean) => void }) {
  const target = targetFinish(c)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sheet-wide" style={cvar(c.id)}>
        <DialogTitle>{c.name}</DialogTitle>
        <DialogDescription className="sr-only">About {c.name}</DialogDescription>
        <div className="grid gap-5 pb-2">
          {c.description && <div className="about-text"><Linkify text={c.description} /></div>}
          {c.outcomes.length > 0 && (
            <div className="grid gap-2">
              <h3 className="text-title font-bold">{target ? `Where you'll be by ${monthName(target)}` : 'Goals'}</h3>
              <Bullets items={c.outcomes} />
            </div>
          )}
          {!c.description && !c.outcomes.length && <p className="muted">Nothing here yet. Tap Edit, then the pencil by the name.</p>}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// The track's notebook entries, loaded 10 at a time like the Notebook page.
function TrackNotes({ ch, onOpen }: { ch: string; onOpen: (n: Note) => void }) {
  const notes = useNotes({ chapter: ch })
  const items = notes.data?.pages.flat() ?? []
  const more = useLoadMore(notes)
  return (
    <>
      <List empty={notes.isPending ? 'Loading…' : 'Nothing here yet. Add notes, ideas and links with +, or send them to your Telegram bot.'}>
        {items.map((n) => <NoteCard key={n.id} n={n} showTrack={false} onOpen={() => onOpen(n)} />)}
      </List>
      {notes.hasNextPage && <div ref={more} className="empty">{notes.isFetchingNextPage ? 'Loading more…' : ''}</div>}
    </>
  )
}

type Tab = 'learn' | 'resources' | 'projects' | 'notes'

// A track's page.
function ChapterPage({ c }: { c: Chapter }) {
  const { state, dispatch } = useStore()
  const save = useChapterSave()
  const nav = useNavigate()
  const [deleting, setDeleting] = useState(false)
  const [sharing, setSharing] = useState(false)
  const { hash } = useLocation()
  const empty0 = !c.projects.length && !c.resources.length && !c.skills.length
  // A fresh chapter opens in edit mode, ready to fill. A link to a project (#T1) opens the Projects tab.
  const [edit, setEdit] = useState(empty0)
  const [tab, setTab] = useState<Tab>(c.projects.some((p) => p.code && p.code === hash) ? 'projects' : 'learn')
  const sheet = useSheet<Editing>()
  const [noting, setNoting] = useState<{ note?: Note } | null>(null)
  const [about, setAbout] = useState(false)
  const { done, total } = trackProgress(state, c)
  const next = nextUp(state, c)
  const active = c.projects.filter((p) => state.projects[p.id] === 'doing')
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState<ResourceKind | null>(null)
  const q = query.trim().toLowerCase()
  const resources = c.resources.filter((r) => (!kind || r.kind === kind) && (!q || `${r.title} ${r.note ?? ''}`.toLowerCase().includes(q)))
  const kindCount = (k: ResourceKind) => c.resources.filter((r) => r.kind === k).length
  const kinds = RESOURCE_KINDS.filter((k) => kindCount(k.id)).sort((a, b) => kindCount(b.id) - kindCount(a.id))
  // In edit mode every list shows its + and the rows show their controls.
  const listActions = (label: string, e: Editing, idle?: React.ReactNode) => (edit ? <PlusButton label={label} onClick={() => sheet.open(e)} /> : idle)
  const moveIn = <K extends 'projects' | 'skills'>(key: K) => (item: Chapter[K][number], d: -1 | 1) => {
    const xs = c[key] as { id: string }[]
    save({ ...c, [key]: move(xs, xs.findIndex((x) => x.id === item.id), d) })
  }

  const noteCount = useNoteCount({ chapter: c.id })
  const tabs: { id: Tab; label: string; count?: string | number; show: boolean }[] = [
    { id: 'learn', label: 'Skills', count: total ? `${done}/${total}` : c.skills.length || undefined, show: true },
    { id: 'resources', label: 'Resources', count: c.resources.length || undefined, show: true },
    { id: 'projects', label: 'Projects', count: c.projects.length || undefined, show: true },
    { id: 'notes', label: 'Notebook', count: noteCount || undefined, show: true },
  ]

  // The focus (heavy) track gets the study sessions and the weekend project. Choosing it locks on with a sound and animation.
  const isFocus = focusOf(state) === c.id
  const head = useRef<HTMLDivElement>(null)
  const [pop, setPop] = useState(false)
  const makeFocus = () => {
    dispatch({ type: 'settings', patch: { program: { ...program(state), focus: c.id } } })
    playFocus()
    setPop(true)
    if (head.current) lockOn(head.current)
    toast(`${c.name} is now the focus.`)
  }

  usePageBar({
    back: { to: '/tracks', label: 'Tracks' },
    actions: [
      { label: 'Edit', icon: Pencil, onSelect: () => setEdit(true) },
      ...(c.kind === 'learn' ? [{ label: 'Share', icon: Share2, onSelect: () => setSharing(true) }] : []),
      // Personal is the built-in default track (new notes and routines go there), so it can't be deleted.
      ...(c.kind === 'general' ? [] : [{ label: 'Delete track', icon: Trash2, onSelect: () => setDeleting(true), danger: true }]),
    ],
    done: edit ? () => setEdit(false) : undefined,
  })

  return (
    <>
      <div ref={head} className={`track-head${pop ? ' focus-pop' : ''}`} style={cvar(c.id)} onAnimationEnd={(e) => e.target === e.currentTarget && setPop(false)}>
      {/* The name opens About; in edit mode it opens the details form. */}
      <Header title={<><span className="dot title-dot" />{c.name}</>}
        action={edit
          ? { label: `Edit ${c.name}'s details`, icon: Pencil, onClick: () => sheet.open({ kind: 'chapter' }) }
          : { label: `About ${c.name}`, icon: Info, onClick: () => setAbout(true) }}>
        {/* Right of the title: the Focus badge, or a button to make this the focus track. */}
        {c.kind === 'learn' && (isFocus
          ? <span className="focus-badge"><Crosshair aria-hidden="true" />Focus</span>
          : <button type="button" className="focus-set" onClick={makeFocus}><Crosshair aria-hidden="true" />Set focus</button>)}
      </Header>

      {total > 0 && (
        <div className="chapter-progress" style={cvar(c.id)}>
          <Meter value={done / total} label={`${done} of ${total} topics done`} />
          <span className="muted text-small">
            {done} of {total} topics{next ? `, skill ${next.index + 1} of ${c.skills.length}` : ', all done'}
          </span>
        </div>
      )}
      </div>
      {active.length > 0 && (
        <button type="button" className="active-project" style={cvar(c.id)} onClick={() => setTab('projects')}>
          <span className="muted">In progress:</span> <span className="project-code">{active[0].code}</span> <b>{active[0].name}</b>
          {active.length > 1 && <span className="muted"> and {active.length - 1} more</span>}
        </button>
      )}


      <Tabs value={tab} onChange={setTab} items={tabs.filter((t) => t.show)} />

      {tab === 'projects' && (
        <Section title="Projects" aside={listActions('New project', { kind: 'project', v: blankProject() })}>
          <List empty="No projects yet.">
            {c.projects.map((p) => (
              <ProjectCard key={p.id} ch={c.id} p={p}
                editing={edit ? { edit: (v) => sheet.open({ kind: 'project', v }), move: moveIn('projects') } : undefined} />
            ))}
          </List>
        </Section>
      )}

      {tab === 'learn' && (
        <Section title="Skills" aside={listActions('New skill', { kind: 'skill', v: blankSkill() })}>
          {c.skills.length
            ? <SkillFolds ch={c.id} skills={c.skills} current={next?.skill.id} itemsLabel="Topics, in order"
                editing={edit ? { edit: (v) => sheet.open({ kind: 'skill', v }), move: moveIn('skills') } : undefined} />
            : <List empty="No skills yet. Tap Edit, then + to add one." />}
        </Section>
      )}

      {tab === 'resources' && (
        <Section title="Resources" aside={listActions('New resource', { kind: 'resource', v: blankResource() })}>
          {c.resources.length > 3 && (
            <>
              <SearchField value={query} onChange={setQuery} placeholder="Search by title or note" />
              {kinds.length > 1 && (
                <ChipsList label="Resource type">
                  <Chip pressed={!kind} onClick={() => setKind(null)} count={c.resources.length}>All</Chip>
                  {kinds.map((k) => <Chip key={k.id} pressed={kind === k.id} onClick={() => setKind(k.id)} count={kindCount(k.id)}>{k.label}</Chip>)}
                </ChipsList>
              )}
            </>
          )}
          {resources.length
            ? <ResourceGroups ch={c.id} resources={resources} editing={edit ? { edit: (v) => sheet.open({ kind: 'resource', v }) } : undefined} />
            : <List empty={c.resources.length ? 'Nothing matches.' : 'No resources yet.'} />}
        </Section>
      )}

      {tab === 'notes' && (
        <Section title="Notebook" aside={<PlusButton label="New note" onClick={() => setNoting({})} />}>
          <TrackNotes ch={c.id} onOpen={(n) => setNoting({ note: n })} />
        </Section>
      )}

      <AboutSheet c={c} open={about} onOpenChange={setAbout} />
      {sharing && <ShareSheet open onOpenChange={setSharing} kind="track" name={c.name} data={trackSnapshot(c)} />}
      <ConfirmSheet open={deleting} onOpenChange={setDeleting} title={`Delete ${c.name}?`}
        description={`Its skills, resources and projects go with it. Notes filed under it stay in your notebook. This can't be undone.`}
        onConfirm={() => {
          dispatch({ type: 'deleteChapter', id: c.id })
          toast(`${c.name} deleted.`)
          void nav({ to: '/tracks' })
        }} />
      {noting && <NoteSheet open onOpenChange={(o) => !o && setNoting(null)} note={noting.note} chapter={c.id} />}
      {sheet.value?.kind === 'chapter' && <ChapterSheet {...sheet.props} chapter={c} />}
            {sheet.value?.kind === 'project' && <ProjectSheet {...sheet.props} chapter={c} project={sheet.value.v} />}
      {sheet.value?.kind === 'resource' && <ResourceSheet {...sheet.props} chapter={c} resource={sheet.value.v} />}
      {sheet.value?.kind === 'skill' && <SkillSheet {...sheet.props} chapter={c} skill={sheet.value.v} />}
    </>
  )
}
