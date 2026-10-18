// Sheets that create and edit a topic and the things inside it.
import { useState } from 'react'
import { PALETTE, PROJECT_SIZES, RESOURCE_KINDS, freshId, nextPosition, nextProjectCode, uid } from '@/lib/content'
import type { Topic, TopicKind, Project, Resource, Skill } from '@/lib/types'
import { monthName, targetFinish } from '@/lib/derive'
import { useStore } from '@/store/StoreProvider'
import { t } from '@/i18n'
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

  return (
    <FormSheet {...sheet} wide title={isNew ? t.topics.form.newTopic : t.common.editNamed(topic.name)} submit={isNew ? t.topics.form.createTopic : t.common.save}
      onSubmit={() => {
        if (!c.name.trim()) return fail(t.topics.form.topicNameFirst)
        const id = c.id || freshId(c.name, state.topics.map((x) => x.id))
        const next: Topic = {
          ...c, id, name: c.name.trim(),
          outcomes: cleanLines(c.outcomes),
        }
        save(next)
        onSaved?.(next)
      }}>
      <div className="grid2">
        <TextField label={t.topics.form.name} value={c.name} onChange={(name) => set({ name })} placeholder={t.topics.form.topicNamePlaceholder} hint={t.topics.form.topicNameHint} required />
        <ColorField value={c.color} onChange={(color) => set({ color })} />
      </div>
      <AreaField label={t.topics.form.about} rows={5} value={c.description ?? ''} onChange={(description) => set({ description })} placeholder={t.topics.form.aboutPlaceholder} hint={t.topics.form.aboutHint} />
      <LinesField label={target ? t.topics.goalsBy(monthName(target)) : t.topics.goals} value={c.outcomes} onChange={(outcomes) => set({ outcomes })} rows={3} />
      {c.kind === 'learn' && (
        <>
          <SelectField label={t.topics.form.duration} value={String(c.months ?? 0)} onChange={(v) => set({ months: Number(v) || undefined })}
            hint={target ? t.topics.form.finishAround(monthName(target)) : t.topics.form.noTargetHint}
            options={[0, 3, 6, 9, 12, 18, 24, 36].map((m) => ({ value: String(m), label: m ? t.topics.form.months(m) : t.topics.form.noTarget }))} />
        </>
      )}
      {/* Stored as one comma-separated string; the Telegram bot reads it to file notes and links. */}
      <LinesField label={t.topics.form.keywords} hint={t.topics.form.keywordsHint} placeholder={t.topics.form.keywordsPlaceholder}
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
    <FormSheet {...sheet} wide title={isNew ? t.topics.form.newProject : t.common.editNamed(project.code)}
      onSubmit={() => {
        if (!p.name.trim()) return fail(t.topics.form.projectNameFirst)
        // The code is made once, from the topic's name; it never changes, so text that mentions it keeps linking.
        const next = { ...p, name: p.name.trim(), code: p.code || nextProjectCode(topic, state.topics), steps: cleanLines(steps), size: p.size ?? 'small' }
        save({ ...topic, projects: isNew ? [...topic.projects, next] : topic.projects.map((x) => (x.id === p.id ? next : x)) })
      }}>
      <TextField label={t.topics.form.name} value={p.name} onChange={(name) => set({ name })} placeholder={t.topics.form.projectNamePlaceholder} required full
        hint={t.topics.form.projectCodeHint(p.code || nextProjectCode(topic, state.topics))} />
      <AreaField label={t.topics.form.goal} value={p.goal ?? ''} onChange={(goal) => set({ goal })} rows={3} />
      <LinesField label={t.topics.form.steps} value={steps} onChange={setSteps} />
      <TextField label={t.topics.form.doneWhen} value={p.done ?? ''} onChange={(done) => set({ done })} full />
      <LinesField label={t.topics.form.trains} value={p.trains ?? []} onChange={(trains) => set({ trains })} placeholder={t.topics.form.trainsPlaceholder} />
      <SelectField label={t.topics.form.size} value={p.size ?? 'small'} onChange={(size) => set({ size })} options={PROJECT_SIZES.map((z) => ({ value: z.value, label: <>{t.topics.sizes[z.value].label}<span className="text-muted-foreground">{t.topics.sizes[z.value].means}</span></> }))} />
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
    <FormSheet {...sheet} title={isNew ? t.topics.form.newResource : t.topics.form.editResource}
      onSubmit={() => {
        if (!r.title.trim()) return fail(t.topics.form.resourceTitleFirst)
        const next = { ...r, title: r.title.trim(), url: r.url?.trim() || undefined, note: r.note?.trim() || undefined }
        save({ ...topic, resources: isNew ? [...topic.resources, next] : topic.resources.map((x) => (x.id === r.id ? next : x)) })
      }}>
      <TextField label={t.topics.form.title} value={r.title} onChange={(title) => set({ title })} placeholder={t.topics.form.titlePlaceholder} required full />
      <TextField label={t.topics.form.link} type="url" value={r.url ?? ''} onChange={(url) => set({ url })} placeholder="https://" full />
      <div className="grid2">
        <SelectField label={t.topics.form.type} value={r.kind} onChange={(kind) => set({ kind })} options={RESOURCE_KINDS.map((k) => ({ value: k.id, label: t.topics.resourceKind[k.id] }))} />

      </div>
      <TextField label={t.topics.form.note} value={r.note ?? ''} onChange={(note) => set({ note })} full />
      <SwitchField label={t.topics.form.free} checked={!!r.free} onChange={(free) => set({ free })} />
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
  return (
    <FormSheet {...sheet} wide title={isNew ? t.topics.form.newSkill : t.topics.form.editSkill}
      onSubmit={() => {
        if (!name.trim()) return fail(t.topics.form.skillNameFirst)
        const next: Skill = { ...skill, name: name.trim(), intro: intro.trim() || undefined, steps: linesToItems(lines, skill.steps) }
        save({ ...topic, skills: isNew ? [...topic.skills, next] : topic.skills.map((x) => (x.id === skill.id ? next : x)) })
      }}>
      <TextField label={t.topics.form.name} value={name} onChange={setName} placeholder={t.topics.form.skillNamePlaceholder} required full />
      <AreaField label={t.topics.form.intro} value={intro} onChange={setIntro} rows={3} placeholder={t.topics.form.introPlaceholder} />
      <LinesField label={t.topics.form.stepsInOrder} value={lines} onChange={setLines} placeholder={t.topics.form.stepsPlaceholder} hint={t.topics.form.stepsHint} />
    </FormSheet>
  )
}

export const blankSkill = (): Skill => ({ id: uid(), name: '', steps: [] })

