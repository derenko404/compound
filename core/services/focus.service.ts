import { fail } from '../domain/errors'
import type { Repositories } from '../ports/repositories'
import { TopicService } from './topic.service'

/** The focus topic: the learning topic Today studies from. */
export class FocusService {
  private readonly repos: Repositories
  private readonly topics: TopicService

  constructor(repos: Repositories) {
    this.repos = repos
    this.topics = new TopicService(repos)
  }

  async get(): Promise<string | null> {
    return (await this.repos.settings.program())?.focus ?? null
  }

  async set(id: string): Promise<string> {
    const t = await this.topics.get(id)
    if (t.kind !== 'learn') fail(400, 'Only a learning topic can be the focus.')
    const program = await this.repos.settings.program()
    await this.repos.settings.setProgram({ ...program, focus: t.id })
    return t.id
  }
}
