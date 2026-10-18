import { PALETTE, codePrefix, freshId, nextPosition } from '../domain/content'
import { fail } from '../domain/errors'
import type { Project, Resource, Skill, Topic } from '../domain/types'
import type { Repositories } from '../ports/repositories'
import type { ProjectInput, ResourceInput, SkillInput, TopicInput } from './inputs'
import { keep } from './keep'

/** Topics: reading them with their ticks, and creating or changing them from outside the app (AI, API). */
export class TopicService {
  private readonly repos: Repositories

  constructor(repos: Repositories) {
    this.repos = repos
  }

  all() {
    return this.repos.topics.all()
  }

  // Ticked step and resource ids.
  async ticks(): Promise<Set<string>> {
    return new Set(Object.keys(await this.repos.ticks.all()))
  }

  async get(id: string): Promise<Topic> {
    return this.find(await this.all(), id)
  }

  async create(input: TopicInput): Promise<Topic> {
    const all = await this.all()
    const name = input.name || fail(400, 'A topic needs a name.')
    const t: Topic = {
      id: freshId(name, all.map((x) => x.id)), kind: 'learn', position: nextPosition(all), name,
      color: this.isColor(input.color) ? input.color : this.freeColor(all),
      description: input.description || undefined, outcomes: input.goals ?? [],
      months: this.months(input.months), created_at: new Date().toISOString(),
      skills: this.skills(input.skills), resources: this.resources(input.resources), projects: [], hint: input.hint || undefined,
    }
    t.projects = this.projects(input.projects, t, [...all, t])
    await this.repos.topics.put(t)
    return t
  }

  // Only the fields given change. Lists given add and change items but never drop them (see keep).
  async update(id: string, input: TopicInput): Promise<Topic> {
    const all = await this.all()
    const t = { ...this.find(all, id) }
    if (input.name !== undefined) t.name = input.name || fail(400, 'A topic needs a name.')
    if (input.description !== undefined) t.description = input.description || undefined
    if (input.goals !== undefined) t.outcomes = keep.byText(input.goals, t.outcomes)
    if (input.months !== undefined) t.months = this.months(input.months)
    if (this.isColor(input.color)) t.color = input.color
    if (input.skills !== undefined) {
      // A skill sent back keeps the steps it didn't mention, like the lists around it.
      const sent = this.skills(input.skills).map((k) => {
        const old = t.skills.find((o) => o.id === k.id)
        return old ? { ...k, steps: keep.byId(k.steps, old.steps) } : k
      })
      t.skills = keep.byId(sent, t.skills)
    }
    if (input.resources !== undefined) t.resources = keep.byId(this.resources(input.resources), t.resources)
    if (input.projects !== undefined) t.projects = keep.byId(this.projects(input.projects, t, all), t.projects)
    await this.repos.topics.put(t)
    return t
  }

  find(all: Topic[], id: string): Topic {
    return all.find((t) => t.id === id) ?? fail(404, `No topic with id "${id}".`)
  }

  private isColor(c: string | undefined): c is string {
    return !!c && (PALETTE as readonly string[]).includes(c)
  }

  private freeColor(all: Topic[]) {
    return PALETTE.find((p) => !all.some((c) => c.color === p)) ?? PALETTE[all.length % PALETTE.length]
  }

  private months(m: number | undefined) {
    return m && Number.isInteger(m) && m > 0 ? m : undefined
  }

  // Steps may come as plain text or as { id, text }. Keeping an id keeps its tick.
  private skills(xs: SkillInput[] = []): Skill[] {
    return xs.map((k) => ({
      id: k.id || crypto.randomUUID(),
      name: k.name || fail(400, 'Every skill needs a name.'),
      intro: k.intro || undefined,
      steps: (k.steps ?? []).map((s) => (typeof s === 'string' ? { id: crypto.randomUUID(), text: s } : { id: s.id || crypto.randomUUID(), text: s.text }))
        .filter((s) => s.text),
    }))
  }

  private resources(xs: ResourceInput[] = []): Resource[] {
    return xs.map((r) => ({
      id: r.id || crypto.randomUUID(),
      title: r.title || fail(400, 'Every resource needs a title.'),
      url: r.url || undefined,
      kind: r.kind ?? 'other',
      note: r.note || undefined,
      free: r.free,
    }))
  }

  // Codes (TE1, TE2…) are given here, from the topic's name, continuing after the codes it already has.
  private projects(xs: ProjectInput[] = [], topic: Topic, all: Topic[]): Project[] {
    const prefix = codePrefix(topic, all)
    let n = 0
    return xs.map((p) => ({
      id: p.id || crypto.randomUUID(),
      code: p.code || `${prefix}${++n}`,
      name: p.name || fail(400, 'Every project needs a name.'),
      goal: p.goal || undefined,
      steps: p.steps?.length ? p.steps : undefined,
      done: p.done || undefined,
      trains: p.trains?.length ? p.trains : undefined,
      size: p.size,
    }))
  }
}
