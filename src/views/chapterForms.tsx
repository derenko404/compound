// Sheets that create and edit a chapter and the things inside it.
import { useState } from 'react'
import { PALETTE, PROJECT_SIZES, RESOURCE_KINDS, freshId, nextPosition, nextProjectCode, uid } from '@/lib/content'
import type { Chapter, ChapterKind, Project, Resource, Skill } from '@/lib/types'
import { monthName, targetFinish } from '@/lib/derive'
import { useStore } from '@/store/StoreProvider'
import { toast } from '@/fx/fx'
import {
  AreaField, ColorField, FormSheet, LinesField, SelectField, SwitchField, TextField, cleanLines, fail, linesToItems,
} from '@/components/edit'

type SheetProps = { open: boolean; onOpenChange: (o: boolean) => void }

export function useChapterSave() {
  const { dispatch } = useStore()
  return (c: Chapter) => dispatch({ type: 'putChapter', chapter: c })
}

export function newChapter(kind: ChapterKind, existing: Chapter[]): Chapter {
  return {
    id: '', kind, position: nextPosition(existing), name: '', color: PALETTE[existing.length % PALETTE.length],
    outcomes: [], projects: [], resources: [], skills: [], created_at: new Date().toISOString(),
  }
}

/* ---------- The chapter itself ---------- */

export function ChapterSheet({ chapter, onSaved, ...sheet }: SheetProps & { chapter: Chapter; onSaved?: (c: Chapter) => void }) {
  const { state } = useStore()
  const save = useChapterSave()
  const [c, setC] = useState(chapter)
  const target = targetFinish(c)
  const set = (patch: Partial<Chapter>) => setC({ ...c, ...patch })
  const isNew = !chapter.id
  const noun = 'track'
  const Noun = 'Track'

  return (
    <FormSheet {...sheet} wide title={isNew ? `New ${noun}` : `Edit ${chapter.name}`} submit={isNew ? `Create ${noun}` : 'Save'}
      onSubmit={() => {
        if (!c.name.trim()) return fail(`Give the ${noun} a name first.`)
        const id = c.id || freshId(c.name, state.chapters.map((x) => x.id))
        const next: Chapter = {
          ...c, id, name: c.name.trim(),
          outcomes: cleanLines(c.outcomes),
        }
        save(next)
        toast(isNew ? `${Noun} created.` : `${Noun} saved.`)
        onSaved?.(next)
      }}>
      <div className="grid2">
        <TextField label="Name" value={c.name} onChange={(name) => set({ name })} placeholder="Technical" hint="Keep it short: it shows on tags and buttons" required />
        <ColorField value={c.color} onChange={(color) => set({ color })} />
      </div>
      <AreaField label="About" rows={5} value={c.description ?? ''} onChange={(description) => set({ description })} placeholder="What this track is about, why it matters, and advice for learning it" hint="Separate paragraphs with an empty line" />
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

export function ProjectSheet({ chapter, project, ...sheet }: SheetProps & { chapter: Chapter; project: Project }) {
  const save = useChapterSave()
  const { state } = useStore()
  const [p, setP] = useState(project)
  const [steps, setSteps] = useState(project.steps ?? [])
  const isNew = !chapter.projects.some((x) => x.id === project.id)
  const set = (patch: Partial<Project>) => setP({ ...p, ...patch })
  return (
    <FormSheet {...sheet} wide title={isNew ? 'New project' : `Edit ${project.code}`}
      onDelete={isNew ? undefined : () => save({ ...chapter, projects: chapter.projects.filter((x) => x.id !== p.id) })}
      onSubmit={() => {
        if (!p.name.trim()) return fail('Give the project a name first.')
        // The code is made once, from the track's name; it never changes, so text that mentions it keeps linking.
        const next = { ...p, name: p.name.trim(), code: p.code || nextProjectCode(chapter, state.chapters), steps: cleanLines(steps), size: p.size ?? 'small' }
        save({ ...chapter, projects: isNew ? [...chapter.projects, next] : chapter.projects.map((x) => (x.id === p.id ? next : x)) })
      }}>
      <TextField label="Name" value={p.name} onChange={(name) => set({ name })} placeholder="URL shortener on AWS" required full
        hint={`Its code is ${p.code || nextProjectCode(chapter, state.chapters)}. Mention it in any text to link here.`} />
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
        const next = { ...r, title: r.title.trim(), url: r.url?.trim() || undefined, note: r.note?.trim() || undefined }
        save({ ...chapter, resources: isNew ? [...chapter.resources, next] : chapter.resources.map((x) => (x.id === r.id ? next : x)) })
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

export function SkillSheet({ chapter, skill, ...sheet }: SheetProps & { chapter: Chapter; skill: Skill }) {
  const save = useChapterSave()
  const [name, setName] = useState(skill.name)
  const [intro, setIntro] = useState(skill.intro ?? '')
  const [lines, setLines] = useState(skill.topics.map((t) => t.text))
  const isNew = !chapter.skills.some((x) => x.id === skill.id)
  const noun = 'skill'
  return (
    <FormSheet {...sheet} wide title={isNew ? `New ${noun}` : `Edit ${noun}`}
      onDelete={isNew ? undefined : () => save({ ...chapter, skills: chapter.skills.filter((x) => x.id !== skill.id) })}
      onSubmit={() => {
        if (!name.trim()) return fail(`Give the ${noun} a name first.`)
        const next: Skill = { ...skill, name: name.trim(), intro: intro.trim() || undefined, topics: linesToItems(lines, skill.topics) }
        save({ ...chapter, skills: isNew ? [...chapter.skills, next] : chapter.skills.map((x) => (x.id === skill.id ? next : x)) })
      }}>
      <TextField label="Name" value={name} onChange={setName} placeholder="Startups" required full />
      <AreaField label="Intro" value={intro} onChange={setIntro} rows={3} placeholder="What this skill is and why it matters (optional)" />
      <LinesField label="Topics, in order" value={lines} onChange={setLines} placeholder="Finding ideas" hint="Ticks stay on items you don't change." />
    </FormSheet>
  )
}

export const blankSkill = (): Skill => ({ id: uid(), name: '', topics: [] })

