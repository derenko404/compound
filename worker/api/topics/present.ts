import type { Topic } from '../../../core/domain/types'

/** What an AI reads back about topics: ticks as `done` flags, the app's names mapped to the API's. */
export const present = {
  topic: (t: Topic, done: Set<string>) => ({
    id: t.id, name: t.name, kind: t.kind, color: t.color, description: t.description ?? '', goals: t.outcomes, months: t.months ?? null,
    skills: t.skills.map((k) => ({ id: k.id, name: k.name, intro: k.intro ?? '', steps: k.steps.map((x) => ({ id: x.id, text: x.text, done: done.has(x.id) })) })),
    resources: t.resources.map((r) => ({ ...r, done: done.has(r.id) })),
    projects: t.projects,
  }),
  summary: (t: Topic, done: Set<string>) => {
    const steps = t.skills.flatMap((k) => k.steps)
    return {
      id: t.id, name: t.name, kind: t.kind, skills: t.skills.length, steps: steps.length,
      steps_done: steps.filter((x) => done.has(x.id)).length, resources: t.resources.length, projects: t.projects.length,
    }
  },
}
