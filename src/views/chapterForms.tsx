// Sheets that create and edit a chapter and the things inside it.
import { useState } from 'react'
import { KIND_LABEL, PALETTE, RESOURCE_KINDS, freshId, nextPosition, program, uid } from '@/lib/content'
import type { Chapter, ChapterKind, Checklist, Components, PlanTask, Project, Resource } from '@/lib/types'
import { useStore } from '@/store/StoreProvider'
import { toast } from '@/fx/fx'
import {
  AreaField, ColorField, FormSheet, LinesField, MonthField, SelectField, SwitchField, TextField, WeekdaysField, cleanLines, fail, linesToItems,
} from '@/components/edit'

type SheetProps = { open: boolean; onOpenChange: (o: boolean) => void }

export function useChapterSave() {
  const { dispatch } = useStore()
  return (c: Chapter) => dispatch({ type: 'putChapter', chapter: c })
}

export function newChapter(kind: ChapterKind, existing: Chapter[], months: number): Chapter {
  return {
    id: '', kind, position: nextPosition(existing), name: '', short: '', color: PALETTE[existing.length % PALETTE.length],
    start: 0, months, outcomes: [], skills: [], tasks: [], projects: [], resources: [], checklists: [], tips: [],
  }
}

/* ---------- The chapter itself ---------- */

export function ChapterSheet({ chapter, onSaved, ...sheet }: SheetProps & { chapter: Chapter; onSaved?: (c: Chapter) => void }) {
  const { state, dispatch } = useStore()
  const save = useChapterSave()
  const total = program(state).months
  const [c, setC] = useState(chapter)
  const set = (patch: Partial<Chapter>) => setC({ ...c, ...patch })
  const isNew = !chapter.id

  return (
    <FormSheet {...sheet} wide title={isNew ? 'New chapter' : `Edit ${chapter.name}`} submit={isNew ? 'Create chapter' : 'Save'}
      onDelete={isNew ? undefined : () => { dispatch({ type: 'deleteChapter', id: chapter.id }); toast('Chapter deleted.') }}
      onSubmit={() => {
        if (!c.name.trim()) return fail('Give the chapter a name first.')
        const id = c.id || freshId(c.short || c.name, state.chapters.map((x) => x.id))
        const next: Chapter = {
          ...c, id, name: c.name.trim(), short: (c.short || c.name).trim(),
          outcomes: cleanLines(c.outcomes), skills: cleanLines(c.skills), tips: cleanLines(c.tips),
          months: Math.max(1, Math.min(c.months, total - c.start)),
        }
        save(next)
        toast(isNew ? 'Chapter created.' : 'Chapter saved.')
        onSaved?.(next)
      }}>
      <div className="grid2">
        <TextField label="Name" value={c.name} onChange={(name) => set({ name })} placeholder="Deep technical" required />
        <TextField label="Short name" value={c.short} onChange={(short) => set({ short })} placeholder="Technical" hint="Shown on tags and buttons" />
        <SelectField label="Type" value={c.kind} onChange={(kind) => set({ kind })}
          options={(Object.keys(KIND_LABEL) as ChapterKind[]).map((k) => ({ value: k, label: KIND_LABEL[k] }))} />
        <MonthField label="Starts" value={c.start} months={total} onChange={(start) => set({ start })} />
        <SelectField label="Duration" value={String(c.months)} onChange={(v) => set({ months: Number(v) })}
          options={Array.from({ length: total - c.start }, (_, i) => ({ value: String(i + 1), label: `${i + 1} month${i ? 's' : ''}` }))} />
        <ColorField value={c.color} onChange={(color) => set({ color })} />
      </div>
      <AreaField label="Description" value={c.description ?? ''} onChange={(description) => set({ description })} placeholder="What this chapter is about and why it matters" />
      <LinesField label={`Where you'll be in ${c.months} month${c.months === 1 ? '' : 's'}`} value={c.outcomes} onChange={(outcomes) => set({ outcomes })} rows={3} />
      <LinesField label="Skills" value={c.skills} onChange={(skills) => set({ skills })} rows={3} />
      <LinesField label="Tips" value={c.tips} onChange={(tips) => set({ tips })} />
      <TextField label="Keywords for the Telegram bot" value={c.hint ?? ''} onChange={(hint) => set({ hint })} placeholder="budget, savings, investing" hint="Helps the bot file notes and links here" />
    </FormSheet>
  )
}

/* ---------- Plan task ---------- */

export function TaskSheet({ chapter, task, ...sheet }: SheetProps & { chapter: Chapter; task: PlanTask }) {
  const save = useChapterSave()
  const { state } = useStore()
  const [t, setT] = useState(task)
  const isNew = !chapter.tasks.some((x) => x.id === task.id)
  const total = program(state).months
  return (
    <FormSheet {...sheet} title={isNew ? 'New plan task' : 'Edit plan task'}
      onDelete={isNew ? undefined : () => save({ ...chapter, tasks: chapter.tasks.filter((x) => x.id !== t.id) })}
      onSubmit={() => {
        if (!t.text.trim()) return fail('Describe the task first.')
        const next = { ...t, text: t.text.trim(), to: Math.max(t.from, t.to) }
        const tasks = isNew ? [...chapter.tasks, next] : chapter.tasks.map((x) => (x.id === t.id ? next : x))
        save({ ...chapter, tasks: tasks.sort((a, b) => a.from - b.from || a.to - b.to) })
      }}>
      <AreaField label="Task" value={t.text} onChange={(text) => setT({ ...t, text })} rows={3} placeholder="Read DDIA chapters 1–3" hint="Mention a project code (T1) or a resource title to link it" />
      <div className="grid2">
        <MonthField label="From" value={t.from} months={total} onChange={(from) => setT({ ...t, from, to: Math.max(from, t.to) })} />
        <MonthField label="To" value={t.to} months={total} onChange={(to) => setT({ ...t, to })} />
      </div>
    </FormSheet>
  )
}

export const blankTask = (from: number): PlanTask => ({ id: uid(), text: '', from, to: from })

/* ---------- Project ---------- */

export function ProjectSheet({ chapter, project, ...sheet }: SheetProps & { chapter: Chapter; project: Project }) {
  const save = useChapterSave()
  const [p, setP] = useState(project)
  const [steps, setSteps] = useState(project.steps ?? [])
  const isNew = !chapter.projects.some((x) => x.id === project.id)
  const set = (patch: Partial<Project>) => setP({ ...p, ...patch })
  return (
    <FormSheet {...sheet} wide title={isNew ? 'New project' : `Edit ${project.code || project.name}`}
      onDelete={isNew ? undefined : () => save({ ...chapter, projects: chapter.projects.filter((x) => x.id !== p.id) })}
      onSubmit={() => {
        if (!p.name.trim()) return fail('Give the project a name first.')
        const next = { ...p, name: p.name.trim(), code: p.code.trim(), steps: cleanLines(steps) }
        save({ ...chapter, projects: isNew ? [...chapter.projects, next] : chapter.projects.map((x) => (x.id === p.id ? next : x)) })
      }}>
      <div className="grid2">
        <TextField label="Code" value={p.code} onChange={(code) => set({ code: code.toUpperCase() })} placeholder="T7" hint="Text that mentions it links here" />
        <TextField label="Name" value={p.name} onChange={(name) => set({ name })} placeholder="URL shortener on AWS" required />
      </div>
      <AreaField label="Goal" value={p.goal ?? ''} onChange={(goal) => set({ goal })} rows={3} />
      <LinesField label="Steps" value={steps} onChange={setSteps} />
      <TextField label="Done when" value={p.done ?? ''} onChange={(done) => set({ done })} full />
      <div className="grid2">
        <TextField label="Trains" value={p.trains ?? ''} onChange={(trains) => set({ trains })} />
        <TextField label="Size" value={p.size ?? ''} onChange={(size) => set({ size })} placeholder="Medium (4–6 weekends)" />
      </div>
    </FormSheet>
  )
}

export const blankProject = (): Project => ({ id: uid(), code: '', name: '' })

/* ---------- Resource ---------- */

export function ResourceSheet({ chapter, resource, ...sheet }: SheetProps & { chapter: Chapter; resource: Resource }) {
  const save = useChapterSave()
  const [r, setR] = useState(resource)
  const isNew = !chapter.resources.some((x) => x.id === resource.id)
  const set = (patch: Partial<Resource>) => setR({ ...r, ...patch })
  return (
    <FormSheet {...sheet} title={isNew ? 'New resource' : 'Edit resource'}
      onDelete={isNew ? undefined : () => save({ ...chapter, resources: chapter.resources.filter((x) => x.id !== r.id) })}
      onSubmit={() => {
        if (!r.title.trim()) return fail('Give the resource a title first.')
        const next = { ...r, title: r.title.trim(), url: r.url?.trim() || undefined, note: r.note?.trim() || undefined, topic: r.topic?.trim() || undefined }
        save({ ...chapter, resources: isNew ? [...chapter.resources, next] : chapter.resources.map((x) => (x.id === r.id ? next : x)) })
      }}>
      <TextField label="Title" value={r.title} onChange={(title) => set({ title })} placeholder="Designing Data-Intensive Applications" required full />
      <TextField label="Link" type="url" value={r.url ?? ''} onChange={(url) => set({ url })} placeholder="https://" full />
      <div className="grid2">
        <SelectField label="Type" value={r.kind} onChange={(kind) => set({ kind })} options={RESOURCE_KINDS.map((k) => ({ value: k.id, label: k.label.replace(/s$/, '') }))} />
        <TextField label="Topic" value={r.topic ?? ''} onChange={(topic) => set({ topic })} placeholder="System design" />
      </div>
      <TextField label="Note" value={r.note ?? ''} onChange={(note) => set({ note })} full />
      <SwitchField label="Free" checked={!!r.free} onChange={(free) => set({ free })} />
    </FormSheet>
  )
}

export const blankResource = (): Resource => ({ id: uid(), title: '', kind: 'book' })

/* ---------- Checklist ---------- */

export function ChecklistSheet({ chapter, list, ...sheet }: SheetProps & { chapter: Chapter; list: Checklist }) {
  const save = useChapterSave()
  const [title, setTitle] = useState(list.title)
  const [lines, setLines] = useState(list.items.map((i) => i.text))
  const isNew = !chapter.checklists.some((x) => x.id === list.id)
  return (
    <FormSheet {...sheet} wide title={isNew ? 'New checklist' : 'Edit checklist'}
      onDelete={isNew ? undefined : () => save({ ...chapter, checklists: chapter.checklists.filter((x) => x.id !== list.id) })}
      onSubmit={() => {
        if (!title.trim()) return fail('Give the checklist a title first.')
        const next = { ...list, title: title.trim(), items: linesToItems(lines, list.items) }
        save({ ...chapter, checklists: isNew ? [...chapter.checklists, next] : chapter.checklists.map((x) => (x.id === list.id ? next : x)) })
      }}>
      <TextField label="Title" value={title} onChange={setTitle} placeholder="Before quit day" required full />
      <LinesField label="Items" value={lines} onChange={setLines} rows={8} hint="One per line. Ticks stay on lines you don't change." />
    </FormSheet>
  )
}

export const blankChecklist = (): Checklist => ({ id: uid(), title: '', items: [] })

/* ---------- Trackers (components) ---------- */

export function ComponentsSheet({ chapter, ...sheet }: SheetProps & { chapter: Chapter }) {
  const save = useChapterSave()
  const c0 = chapter.components ?? {}
  const [quitOn, setQuitOn] = useState(!!c0.quit)
  const [quit, setQuit] = useState(c0.quit ?? {
    date: null, per_day: 10, price: 100, unit: 'cigarettes', milestones: [], tips: [], check_id: `${chapter.id}:clean`, check_title: `${chapter.short}-free today`,
  })
  const [workoutOn, setWorkoutOn] = useState(!!c0.workout)
  const [workout, setWorkout] = useState(c0.workout ?? { start: null, days: [1, 3, 5], workouts: [{ name: 'Workout A', text: '' }], check_id: `${chapter.id}:workout` })
  const [wText, setWText] = useState(workout.workouts.map((w) => `${w.name}: ${w.text}`))
  const [weightOn, setWeightOn] = useState(!!c0.weight)
  const [unit, setUnit] = useState(c0.weight?.unit ?? 'kg')
  const [tips, setTips] = useState(quit.tips)

  return (
    <FormSheet {...sheet} wide title="Trackers" description="Switch on what this chapter tracks. Each one adds a panel here and, when started, a check to Today."
      onSubmit={() => {
        const components: Components = {}
        if (quitOn) components.quit = { ...quit, tips: cleanLines(tips) }
        if (workoutOn) {
          const workouts = cleanLines(wText).map((l) => {
            const [name, ...rest] = l.split(':')
            return rest.length ? { name: name.trim(), text: rest.join(':').trim() } : { name: l, text: '' }
          })
          components.workout = { ...workout, workouts }
        }
        if (weightOn) components.weight = { unit: unit.trim() || 'kg' }
        save({ ...chapter, components })
        toast('Trackers saved.')
      }}>
      <SwitchField label="Quit counter" sub="Clean days, money saved, milestones, and a daily check on Today" checked={quitOn} onChange={setQuitOn} />
      {quitOn && (
        <div className="grid2 panel">
          <TextField label="Check on Today" value={quit.check_title} onChange={(check_title) => setQuit({ ...quit, check_title })} full />
          <TextField label="What you quit (plural)" value={quit.unit} onChange={(unit) => setQuit({ ...quit, unit })} />
          <TextField label="Per day before" type="number" value={String(quit.per_day)} onChange={(v) => setQuit({ ...quit, per_day: Number(v) || 0 })} />
          <TextField label="Price per 20" type="number" value={String(quit.price)} onChange={(v) => setQuit({ ...quit, price: Number(v) || 0 })} />
          <LinesField label="Tips under the daily check" value={tips} onChange={setTips} rows={4} />
        </div>
      )}
      <SwitchField label="Workout schedule" sub="Workouts on chosen days, rotating in order" checked={workoutOn} onChange={setWorkoutOn} />
      {workoutOn && (
        <div className="grid2 panel">
          <WeekdaysField value={workout.days} onChange={(days) => setWorkout({ ...workout, days })} />
          <LinesField label="Workouts" value={wText} onChange={setWText} rows={3} hint="One per line, as Name: exercises" />
        </div>
      )}
      <SwitchField label="Weight log" sub="Log your weight and see the trend" checked={weightOn} onChange={setWeightOn} />
      {weightOn && <TextField label="Unit" value={unit} onChange={setUnit} />}
    </FormSheet>
  )
}
