// Sheets that create and edit a topic and the things inside it.
import { useState } from 'react'
import { PALETTE, PROJECT_SIZES, RESOURCE_KINDS, freshId, nextPosition, nextProjectCode, uid } from '@/lib/content'
import type { Topic, TopicKind, Project, Resource, Skill } from '@/lib/types'
import { monthName, targetFinish } from '@/lib/derive'
import { useStore } from '@/store/StoreProvider'
import {
  AreaField, ColorField, FormSheet, LinesField, SelectField, SwitchField, TextField, cleanLines, fail, linesToItems,
} from '@/components/edit'

type SheetProps = { open: boolean; onOpenChange: (o: boolean) => void }

export function useTopicSave() {
  const { dispatch } = useStore()
  return (c: Topic) => dispatch({ type: 'putTopic', topic: c })
}

export function newTopic(kind: TopicKind, existing: Topic[]): Topic {
  return {
    id: '', kind, position: nextPosition(existing), name: '', color: PALETTE[existing.length % PALETTE.length],
    outcomes: [], projects: [], resources: [], skills: [], created_at: new Date().toISOString(),
  }
}

/* ---------- The topic itself ---------- */

export function TopicSheet({ topic, onSaved, ...sheet }: SheetProps & { topic: Topic; onSaved?: (c: Topic) => void }) {
  const { state } = useStore()
  const save = useTopicSave()
  const [c, setC] = useState(topic)
  const target = targetFinish(c)
  const set = (patch: Partial<Topic>) => setC({ ...c, ...patch })
  const isNew = !topic.id
  const noun = 'topic'

  return (
    <FormSheet {...sheet} wide title={isNew ? `New ${noun}` : `Edit ${topic.name}`} submit={isNew ? `Create ${noun}` : 'Save'}
      onSubmit={() => {
        if (!c.name.trim()) return fail(`Give the ${noun} a name first.`)
        const id = c.id || freshId(c.name, state.topics.map((x) => x.id))
        const next: Topic = {
          ...c, id, name: c.name.trim(),
          outcomes: cleanLines(c.outcomes),
        }
        save(next)
        onSaved?.(next)
      }}>
      <div className="grid2">
        <TextField label="Name" value={c.name} onChange={(name) => set({ name })} placeholder="Technical" hint="Keep it short: it shows on tags and buttons" required />
        <ColorField value={c.color} onChange={(color) => set({ color })} />
      </div>
      <AreaField label="About" rows={5} value={c.description ?? ''} onChange={(description) => set({ description })} placeholder="What this topic is about, why it matters, and advice for learning it" hint="Separate paragraphs with an empty line" />
      <LinesField label={target ? `Where you'll be by ${monthName(target)}` : 'Goals'} value={c.outcomes} onChange={(outcomes) => set({ outcomes })} rows={3} />
      {c.kind === 'learn' && (
        <>
          <SelectField label="Duration" value={String(c.months ?? 0)} onChange={(v) => set({ months: Number(v) || undefined })}
            hint={target ? `Finish around ${monthName(target)}. Your pace shows whether you'll make it.` : 'No target: pace just shows when you would finish.'}
            options={[0, 3, 6, 9, 12, 18, 24, 36].map((m) => ({ value: String(m), label: m ? `${m} months` : 'No target' }))} />
        </>
      )}
      {/* Stored as one comma-separated string; the Telegram bot reads it to file notes and links. */}
      <LinesField label="Keywords" hint="Helps us in categorization" placeholder="budget"
        value={(c.hint ?? '').split(',').map((x) => x.trim()).filter(Boolean)} onChange={(xs) => set({ hint: xs.join(', ') })} />
    </FormSheet>
  )
}

/* ---------- Project ---------- */

export function ProjectSheet({ topic, project, ...sheet }: SheetProps & { topic: Topic; project: Project }) {
  const save = useTopicSave()
  const { state } = useStore()
  const [p, setP] = useState(project)
  const [steps, setSteps] = useState(project.steps ?? [])
  const isNew = !topic.projects.some((x) => x.id === project.id)
  const set = (patch: Partial<Project>) => setP({ ...p, ...patch })
  return (
    <FormSheet {...sheet} wide title={isNew ? 'New project' : `Edit ${project.code}`}
      onSubmit={() => {
        if (!p.name.trim()) return fail('Give the project a name first.')
        // The code is made once, from the topic's name; it never changes, so text that mentions it keeps linking.
        const next = { ...p, name: p.name.trim(), code: p.code || nextProjectCode(topic, state.topics), steps: cleanLines(steps), size: p.size ?? 'small' }
        save({ ...topic, projects: isNew ? [...topic.projects, next] : topic.projects.map((x) => (x.id === p.id ? next : x)) })
      }}>
      <TextField label="Name" value={p.name} onChange={(name) => set({ name })} placeholder="URL shortener on AWS" required full
        hint={`Its code is ${p.code || nextProjectCode(topic, state.topics)}. Mention it in any text to link here.`} />
      <AreaField label="Goal" value={p.goal ?? ''} onChange={(goal) => set({ goal })} rows={3} />
      <LinesField label="Steps" value={steps} onChange={setSteps} />
      <TextField label="Done when" value={p.done ?? ''} onChange={(done) => set({ done })} full />
      <LinesField label="Trains" value={p.trains ?? []} onChange={(trains) => set({ trains })} placeholder="A skill it practises" />
      <SelectField label="Size" value={p.size ?? 'small'} onChange={(size) => set({ size })} options={PROJECT_SIZES.map((z) => ({ value: z.value, label: <>{z.label}<span className="text-muted-foreground">{z.means}</span></> }))} />
    </FormSheet>
  )
}

export const blankProject = (): Project => ({ id: uid(), code: '', name: '' })

/* ---------- Resource ---------- */

export function ResourceSheet({ topic, resource, ...sheet }: SheetProps & { topic: Topic; resource: Resource }) {
  const save = useTopicSave()
  const [r, setR] = useState(resource)
  const isNew = !topic.resources.some((x) => x.id === resource.id)
  const set = (patch: Partial<Resource>) => setR({ ...r, ...patch })
  return (
    <FormSheet {...sheet} title={isNew ? 'New resource' : 'Edit resource'}
      onSubmit={() => {
        if (!r.title.trim()) return fail('Give the resource a title first.')
        const next = { ...r, title: r.title.trim(), url: r.url?.trim() || undefined, note: r.note?.trim() || undefined }
        save({ ...topic, resources: isNew ? [...topic.resources, next] : topic.resources.map((x) => (x.id === r.id ? next : x)) })
      }}>
      <TextField label="Title" value={r.title} onChange={(title) => set({ title })} placeholder="Designing Data-Intensive Applications" required full />
      <TextField label="Link" type="url" value={r.url ?? ''} onChange={(url) => set({ url })} placeholder="https://" full />
      <div className="grid2">
        <SelectField label="Type" value={r.kind} onChange={(kind) => set({ kind })} options={RESOURCE_KINDS.map((k) => ({ value: k.id, label: k.label.replace(/s$/, '') }))} />

      </div>
      <TextField label="Note" value={r.note ?? ''} onChange={(note) => set({ note })} full />
      <SwitchField label="Free" checked={!!r.free} onChange={(free) => set({ free })} />
    </FormSheet>
  )
}

export const blankResource = (): Resource => ({ id: uid(), title: '', kind: 'book' })

/* ---------- Skill ---------- */

export function SkillSheet({ topic, skill, ...sheet }: SheetProps & { topic: Topic; skill: Skill }) {
  const save = useTopicSave()
  const [name, setName] = useState(skill.name)
  const [intro, setIntro] = useState(skill.intro ?? '')
  const [lines, setLines] = useState(skill.steps.map((t) => t.text))
  const isNew = !topic.skills.some((x) => x.id === skill.id)
  const noun = 'skill'
  return (
    <FormSheet {...sheet} wide title={isNew ? `New ${noun}` : `Edit ${noun}`}
      onSubmit={() => {
        if (!name.trim()) return fail(`Give the ${noun} a name first.`)
        const next: Skill = { ...skill, name: name.trim(), intro: intro.trim() || undefined, steps: linesToItems(lines, skill.steps) }
        save({ ...topic, skills: isNew ? [...topic.skills, next] : topic.skills.map((x) => (x.id === skill.id ? next : x)) })
      }}>
      <TextField label="Name" value={name} onChange={setName} placeholder="Startups" required full />
      <AreaField label="Intro" value={intro} onChange={setIntro} rows={3} placeholder="What this skill is and why it matters (optional)" />
      <LinesField label="Steps, in order" value={lines} onChange={setLines} placeholder="Finding ideas" hint="Ticks stay on items you don't change." />
    </FormSheet>
  )
}

export const blankSkill = (): Skill => ({ id: uid(), name: '', steps: [] })

