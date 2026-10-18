import { useRef, useState } from 'react'
import { Link, getRouteApi, useLocation, useNavigate } from '@tanstack/react-router'
import { Crosshair, Info, Pencil, Share2, Trash2 } from 'lucide-react'
import { usePageBar } from '@/components/bar'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { RESOURCE_KINDS, topicOf, topics, program, topicSnapshot } from '@/lib/content'
import { ShareSheet } from '@/components/share'
import { focusOf, monthName, targetFinish, nextUp, pace, topicProgress } from '@/lib/derive'
import type { Topic, Note, Project, Resource, ResourceKind, Skill } from '@/lib/types'
import { useNoteCount, useNotes, useStore } from '@/store/StoreProvider'
import { lockOn } from '@/fx/fx'
import { playFocus } from '@/fx/sound'
import { currentLocale, t } from '@/i18n'
import {
  Chip, ChipsList, Header, List, Meter, Row, SearchField, Section, SortList, Tabs, cvar, empty,
} from '@/components/kit'
import { ConfirmSheet, RemoveButton, moveTo, useSheet } from '@/components/edit'
import { Bullets, Linkify, ProjectCard, ResourceGroups, SkillFolds } from '@/components/guide'
import { NoteCard, NoteSheet, useLoadMore } from './Notebook'
import {
  TopicSheet, SkillSheet, ProjectSheet, ResourceSheet,
  blankSkill, blankProject, blankResource, newTopic, useTopicSave,
} from './topicForms'

const route = getRouteApi('/topics/$ch')

/* ---------- All topics ---------- */

// One topic on the index: steps done, its focus quarters, and what's next.
function TopicCard({ c }: { c: Topic }) {
  const { state } = useStore()
  const { done, total } = topicProgress(state, c)
  const focus = focusOf(state) === c.id
  const next = nextUp(state, c)
  // Pace only when there is some: steps a week over the last 4 weeks, and when that finishes the topic.
  const { perWeek, left, finish } = pace(state, c, new Date())
  const end = targetFinish(c)
  const late = !!finish && !!end && finish > end
  const paceLine = perWeek && left && finish
    ? `${t.topics.card.pace(String(perWeek % 1 ? perWeek.toFixed(1) : perWeek), finish.toLocaleDateString(currentLocale(), { month: 'short', year: 'numeric' }))}${late ? t.topics.card.late(monthName(end!)) : ''}`
    : null
  return (
    <Link to="/topics/$ch" params={{ ch: c.id }} className={`topic-card${focus ? ' is-focus' : ''}`} style={cvar(c.id)}>
      <div className="topic-card-head">
        <span className="focus-name"><span className="dot" />{c.name}</span>
        {/* One topic is the focus (heavy): it gets the study sessions and the weekend project. Set from the topic's ⋯ menu. */}
        {focus && <span className="focus-badge"><Crosshair aria-hidden="true" />{t.topics.focus}</span>}
      </div>
      {total > 0 ? (
        <>
          <div className="topic-card-progress"><Meter value={done / total} label={t.topics.card.stepsOf(done, total)} /><span>{t.topics.card.doneOf(done, total)}</span></div>
          {next?.step && <div className="topic-card-now"><span className="focus-label">{t.topics.card.nextIn(next.skill.name)}</span>{next.step.text}</div>}
          {paceLine && <div className={`topic-row-pace${late ? ' late' : ''}`}>{paceLine}</div>}
        </>
      ) : (
        <div className="muted text-small">{t.topics.card.counts(c.skills.length, c.resources.length)}</div>
      )}
    </Link>
  )
}

const DELETE_TOPIC = t.topics.index.deleteTopic
const skillCount = (c: Topic) => t.common.skills(c.skills.length)

export function TopicIndex() {
  const { state, dispatch } = useStore()
  const sheet = useSheet<Topic>()
  const nav = useNavigate()
  const [edit, setEdit] = useState(false)
  usePageBar({ add: { label: t.topics.index.newTopic, onClick: () => sheet.open(newTopic('learn', state.topics)) }, edit: () => setEdit(true), done: edit ? () => setEdit(false) : undefined })
  // The focus topic when the page opened leads. Switching focus during the visit moves nothing,
  // like ticks with useDoneLastOnOpen; the next visit shows the new order. Edit mode shows the saved order.
  const [lead] = useState(() => focusOf(state))
  const learn = topics(state, 'learn')
  const roadmap = [...learn].sort((a, b) => Number(b.id === lead) - Number(a.id === lead))
  // Personal, the default topic, sits apart under Other. It can't be deleted.
  const other = topics(state, 'general')
  const reorder = (from: number, to: number) => {
    const ys = moveTo(learn, from, to)
    dispatch({ type: 'batch', ops: ys.flatMap((x, j) => (x.position === j ? [] : [{ type: 'putTopic' as const, topic: { ...x, position: j } }])) })
  }

  return (
    <>
      <Header title={t.topics.index.title} lead={t.topics.index.lead} />
      <Section title={t.topics.index.yours}>
        {edit ? (
          <SortList empty={t.topics.index.empty} onMove={reorder}>
            {learn.map((c) => (
              <Row key={c.id} ch={c.id} title={c.name} sub={skillCount(c)}
                check={<RemoveButton label={t.common.deleteNamed(c.name)} title={t.common.deleteAsk(c.name)} description={DELETE_TOPIC} onConfirm={() => dispatch({ type: 'deleteTopic', id: c.id })} />}
                onOpen={() => sheet.open(c)} sort />
            ))}
          </SortList>
        ) : <div className="card-grid">{roadmap.map((c) => <TopicCard key={c.id} c={c} />)}</div>}
      </Section>
      {other.length > 0 && (
        <Section title={t.topics.index.other}>
          {edit
            ? <List>{other.map((c) => <Row key={c.id} ch={c.id} title={c.name} sub={skillCount(c)} onOpen={() => sheet.open(c)} />)}</List>
            : <div className="card-grid">{other.map((c) => <TopicCard key={c.id} c={c} />)}</div>}
        </Section>
      )}
      {sheet.value && <TopicSheet key={sheet.value.id} {...sheet.props} topic={sheet.value}
        onSaved={sheet.value.id ? undefined : (c) => nav({ to: '/topics/$ch', params: { ch: c.id } })} />}
    </>
  )
}

/* ---------- One topic ---------- */

export function Topics() {
  const { ch } = route.useParams()
  const { state } = useStore()
  const c = topicOf(state, ch)
  if (!c) return empty(t.topics.page.gone)
  return <TopicPage key={c.id} c={c} />
}

type Editing =
  | { kind: 'topic' }
  | { kind: 'project'; v: Project } | { kind: 'resource'; v: Resource } | { kind: 'skill'; v: Skill }

// Read-only: what the topic is about, where it leads, and the skills it builds.
function AboutSheet({ c, open, onOpenChange }: { c: Topic; open: boolean; onOpenChange: (o: boolean) => void }) {
  const target = targetFinish(c)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sheet-wide" style={cvar(c.id)}>
        <DialogTitle>{c.name}</DialogTitle>
        <DialogDescription className="sr-only">{t.topics.page.about(c.name)}</DialogDescription>
        <div className="grid gap-5 pb-2">
          {c.description && <div className="about-text"><Linkify text={c.description} /></div>}
          {c.outcomes.length > 0 && (
            <div className="grid gap-2">
              <h3 className="text-title font-bold">{target ? t.topics.goalsBy(monthName(target)) : t.topics.goals}</h3>
              <Bullets items={c.outcomes} />
            </div>
          )}
          {!c.description && !c.outcomes.length && <p className="muted">{t.topics.page.aboutEmpty}</p>}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// The topic's notebook entries, loaded 10 at a time like the Notebook page.
function TopicNotes({ ch, onOpen, edit }: { ch: string; onOpen: (n: Note) => void; edit?: boolean }) {
  const notes = useNotes({ topic: ch })
  const items = notes.data?.pages.flat() ?? []
  const more = useLoadMore(notes)
  return (
    <>
      <List empty={notes.isPending ? t.common.loading : t.topics.page.notesEmpty}>
        {items.map((n) => <NoteCard key={n.id} n={n} showTopic={false} onOpen={() => onOpen(n)} removable={edit} />)}
      </List>
      {notes.hasNextPage && <div ref={more} className="empty">{notes.isFetchingNextPage ? t.common.loadingMore : ''}</div>}
    </>
  )
}

type Tab = 'learn' | 'resources' | 'projects' | 'notes'

// A topic's page.
function TopicPage({ c }: { c: Topic }) {
  const { state, dispatch } = useStore()
  const save = useTopicSave()
  const nav = useNavigate()
  const [deleting, setDeleting] = useState(false)
  const [sharing, setSharing] = useState(false)
  const { hash } = useLocation()
  const empty0 = !c.projects.length && !c.resources.length && !c.skills.length
  // A fresh topic opens in edit mode, ready to fill. A link to a project (#T1) opens the Projects tab.
  const [edit, setEdit] = useState(empty0)
  const [tab, setTab] = useState<Tab>(c.projects.some((p) => p.code && p.code === hash) ? 'projects' : 'learn')
  const sheet = useSheet<Editing>()
  const [noting, setNoting] = useState<{ note?: Note } | null>(null)
  const [about, setAbout] = useState(false)
  const { done, total } = topicProgress(state, c)
  const next = nextUp(state, c)
  const active = c.projects.filter((p) => state.projects[p.id] === 'doing')
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState<ResourceKind | null>(null)
  const q = query.trim().toLowerCase()
  const resources = c.resources.filter((r) => (!kind || r.kind === kind) && (!q || `${r.title} ${r.note ?? ''}`.toLowerCase().includes(q)))
  const kindCount = (k: ResourceKind) => c.resources.filter((r) => r.kind === k).length
  const kinds = RESOURCE_KINDS.filter((k) => kindCount(k.id)).sort((a, b) => kindCount(b.id) - kindCount(a.id))
  // In edit mode every list shows its + and the rows show their controls.
  // The top bar's + adds to the open tab.
  const add: Record<Tab, { label: string; onClick: () => void }> = {
    learn: { label: t.topics.add.skill, onClick: () => sheet.open({ kind: 'skill', v: blankSkill() }) },
    resources: { label: t.topics.add.resource, onClick: () => sheet.open({ kind: 'resource', v: blankResource() }) },
    projects: { label: t.topics.add.project, onClick: () => sheet.open({ kind: 'project', v: blankProject() }) },
    notes: { label: t.topics.add.note, onClick: () => setNoting({}) },
  }
  const moveIn = (key: 'projects' | 'skills') => (from: number, to: number) => save({ ...c, [key]: moveTo<unknown>(c[key], from, to) })

  const noteCount = useNoteCount({ topic: c.id })
  const tabs: { id: Tab; label: string; count?: string | number; show: boolean }[] = [
    { id: 'learn', label: t.topics.tabs.skills, count: total ? `${done}/${total}` : c.skills.length || undefined, show: true },
    { id: 'resources', label: t.topics.tabs.resources, count: c.resources.length || undefined, show: true },
    { id: 'projects', label: t.topics.tabs.projects, count: c.projects.length || undefined, show: true },
    { id: 'notes', label: t.topics.tabs.notebook, count: noteCount || undefined, show: true },
  ]

  // The focus (heavy) topic gets the study sessions and the weekend project. Choosing it locks on with a sound and animation.
  const isFocus = focusOf(state) === c.id
  const head = useRef<HTMLDivElement>(null)
  const [pop, setPop] = useState(false)
  const makeFocus = () => {
    dispatch({ type: 'settings', patch: { program: { ...program(state), focus: c.id } } })
    playFocus()
    setPop(true)
    if (head.current) lockOn(head.current)
  }

  usePageBar({
    back: { to: '/topics', label: t.topics.page.back },
    add: add[tab],
    edit: () => setEdit(true),
    actions: [
      ...(c.kind === 'learn' ? [{ label: t.common.share, icon: Share2, onSelect: () => setSharing(true) }] : []),
      // Personal is the built-in default topic (new notes and routines go there), so it can't be deleted.
      ...(c.kind === 'general' ? [] : [{ label: t.topics.page.deleteTopic, icon: Trash2, onSelect: () => setDeleting(true), danger: true }]),
    ],
    done: edit ? () => setEdit(false) : undefined,
  })

  return (
    <>
      <div ref={head} className={`topic-head${pop ? ' focus-pop' : ''}`} style={cvar(c.id)} onAnimationEnd={(e) => e.target === e.currentTarget && setPop(false)}>
      {/* The name opens About; in edit mode it opens the details form. */}
      <Header title={<><span className="dot title-dot" />{c.name}</>}
        action={edit
          ? { label: t.topics.page.editDetails(c.name), icon: Pencil, onClick: () => sheet.open({ kind: 'topic' }) }
          : { label: t.topics.page.about(c.name), icon: Info, onClick: () => setAbout(true) }}>
        {/* Right of the title: the Focus badge, or a button to make this the focus topic. */}
        {c.kind === 'learn' && (isFocus
          ? <span className="focus-badge"><Crosshair aria-hidden="true" />{t.topics.focus}</span>
          : <button type="button" className="focus-set" onClick={makeFocus}><Crosshair aria-hidden="true" />{t.topics.setFocus}</button>)}
      </Header>

      {total > 0 && (
        <div className="topic-progress" style={cvar(c.id)}>
          <Meter value={done / total} label={t.topics.page.stepsDone(done, total)} />
          <span className="muted text-small">
            {t.topics.page.stepsOf(done, total)}{next ? t.topics.page.skillOf(next.index + 1, c.skills.length) : t.topics.page.allDone}
          </span>
        </div>
      )}
      </div>
      {active.length > 0 && (
        <button type="button" className="active-project" style={cvar(c.id)} onClick={() => setTab('projects')}>
          <span className="muted">{t.topics.page.inProgress}</span> <span className="project-code">{active[0].code}</span> <b>{active[0].name}</b>
          {active.length > 1 && <span className="muted">{t.topics.page.andMore(active.length - 1)}</span>}
        </button>
      )}


      <Tabs value={tab} onChange={setTab} items={tabs.filter((t) => t.show)} />

      {tab === 'projects' && (
        <Section title={t.topics.tabs.projects}>
          {edit ? (
            <SortList empty={t.topics.empty.projects} onMove={moveIn('projects')}>
              {c.projects.map((p) => (
                <Row key={p.id} ch={c.id} title={p.name} sub={[p.code, p.size].filter(Boolean).join(', ')}
                  check={<RemoveButton label={t.common.deleteNamed(p.name)} title={t.topics.page.deleteProject(p.code, p.name)} onConfirm={() => save({ ...c, projects: c.projects.filter((x) => x.id !== p.id) })} />}
                  onOpen={() => sheet.open({ kind: 'project', v: p })} sort />
              ))}
            </SortList>
          ) : (
            <List empty={t.topics.empty.projects}>{c.projects.map((p) => <ProjectCard key={p.id} ch={c.id} p={p} />)}</List>
          )}
        </Section>
      )}

      {tab === 'learn' && (
        <Section title={t.topics.tabs.skills}>
          {edit ? (
            <SortList empty={t.topics.empty.skills} onMove={moveIn('skills')}>
              {c.skills.map((k) => (
                <Row key={k.id} ch={c.id} title={k.name} sub={t.common.steps(k.steps.length)}
                  check={<RemoveButton label={t.common.deleteNamed(k.name)} title={t.common.deleteAsk(k.name)} description={t.topics.page.deleteSkill}
                    onConfirm={() => save({ ...c, skills: c.skills.filter((x) => x.id !== k.id) })} />}
                  onOpen={() => sheet.open({ kind: 'skill', v: k })} sort />
              ))}
            </SortList>
          ) : c.skills.length
            ? <SkillFolds ch={c.id} skills={c.skills} current={next?.skill.id} itemsLabel={t.topics.skills.stepsInOrder} />
            : <List empty={t.topics.empty.skills} />}
        </Section>
      )}

      {tab === 'resources' && (
        <Section title={t.topics.tabs.resources}>
          {c.resources.length > 3 && (
            <>
              <SearchField value={query} onChange={setQuery} placeholder={t.topics.resources.search} />
              {kinds.length > 1 && (
                <ChipsList label={t.topics.resources.typeFilter}>
                  <Chip pressed={!kind} onClick={() => setKind(null)} count={c.resources.length}>{t.topics.resources.all}</Chip>
                  {kinds.map((k) => <Chip key={k.id} pressed={kind === k.id} onClick={() => setKind(k.id)} count={kindCount(k.id)}>{t.topics.resourceKinds[k.id]}</Chip>)}
                </ChipsList>
              )}
            </>
          )}
          {resources.length
            ? <ResourceGroups ch={c.id} resources={resources} onEdit={edit ? (v) => sheet.open({ kind: 'resource', v }) : undefined}
                onRemove={edit ? (v) => save({ ...c, resources: c.resources.filter((x) => x.id !== v.id) }) : undefined} />
            : <List empty={c.resources.length ? t.common.nothingMatches : t.topics.empty.resources} />}
        </Section>
      )}

      {tab === 'notes' && (
        <Section title={t.topics.tabs.notebook}>
          <TopicNotes ch={c.id} onOpen={(n) => setNoting({ note: n })} edit={edit} />
        </Section>
      )}

      <AboutSheet c={c} open={about} onOpenChange={setAbout} />
      {sharing && <ShareSheet open onOpenChange={setSharing} kind="topic" name={c.name} data={topicSnapshot(c)} />}
      <ConfirmSheet open={deleting} onOpenChange={setDeleting} title={t.common.deleteAsk(c.name)}
        description={DELETE_TOPIC}
        onConfirm={() => {
          dispatch({ type: 'deleteTopic', id: c.id })
          void nav({ to: '/topics' })
        }} />
      {noting && <NoteSheet open onOpenChange={(o) => !o && setNoting(null)} note={noting.note} topic={c.id} />}
      {sheet.value?.kind === 'topic' && <TopicSheet {...sheet.props} topic={c} />}
            {sheet.value?.kind === 'project' && <ProjectSheet {...sheet.props} topic={c} project={sheet.value.v} />}
      {sheet.value?.kind === 'resource' && <ResourceSheet {...sheet.props} topic={c} resource={sheet.value.v} />}
      {sheet.value?.kind === 'skill' && <SkillSheet {...sheet.props} topic={c} skill={sheet.value.v} />}
    </>
  )
}
