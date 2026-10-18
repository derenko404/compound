import { FALLBACK_TOPIC, nextPosition } from '../domain/content'
import { fail } from '../domain/errors'
import type { Routine } from '../domain/types'
import type { Repositories } from '../ports/repositories'
import type { RoutineInput } from './inputs'

/** Routines and one-off tasks on Today. */
export class RoutineService {
  private readonly repos: Repositories

  constructor(repos: Repositories) {
    this.repos = repos
  }

  all() {
    return this.repos.routines.all()
  }

  async add(input: RoutineInput): Promise<Routine> {
    const [routines, topics] = await Promise.all([this.all(), this.repos.topics.all()])
    const r: Routine = {
      id: crypto.randomUUID(), position: nextPosition(routines), title: input.title || fail(400, 'A routine needs a title.'),
      sub: input.details || undefined, topic: topics.some((t) => t.id === input.topic) ? input.topic! : FALLBACK_TOPIC,
      when: input.when ?? { kind: 'daily' }, core: input.counts_for_streak !== false, created_at: new Date().toISOString(),
    }
    await this.repos.routines.put(r)
    return r
  }
}
