import { freshId, nextPosition } from '../domain/content'
import { fail } from '../domain/errors'
import type { ListDef, ListItem } from '../domain/types'
import type { Repositories } from '../ports/repositories'
import type { ListInput, ListItemInput } from './inputs'
import { keep } from './keep'

/** Lists (books, films…): reading them with their ticks and reviews, and creating or changing them from outside the app. */
export class ListService {
  private readonly repos: Repositories

  constructor(repos: Repositories) {
    this.repos = repos
  }

  // Every list with how many of its items are ticked.
  async all(): Promise<{ list: ListDef; done: number }[]> {
    const [lists, progress] = await Promise.all([this.repos.lists.all(), this.repos.listProgress.all()])
    return lists.map((list) => ({ list, done: Object.values(progress[list.id] ?? {}).filter((p) => p.done_at).length }))
  }

  // One list with each item's tick and review.
  async get(id: string): Promise<{ list: ListDef; progress: Record<string, ListItem> }> {
    const [lists, progress] = await Promise.all([this.repos.lists.all(), this.repos.listProgress.all()])
    const list = lists.find((l) => l.id === id) ?? fail(404, `No list with id "${id}".`)
    return { list, progress: progress[list.id] ?? {} }
  }

  async create(input: ListInput) {
    const all = await this.repos.lists.all()
    const name = input.name || fail(400, 'A list needs a name.')
    const l: ListDef = {
      id: freshId(name, all.map((x) => x.id)), position: nextPosition(all), name,
      title: input.title || name, sub_label: input.detail_label ?? '',
      items: this.items(input.items, (i) => String(i)),
    }
    await this.repos.lists.put(l)
    return this.get(l.id)
  }

  // Items given are added or changed; items not sent back stay (see keep), with their ticks and reviews.
  async update(id: string, input: ListInput) {
    const { list } = await this.get(id)
    const l = { ...list }
    if (input.name !== undefined) l.name = input.name || fail(400, 'A list needs a name.')
    if (input.title !== undefined) l.title = input.title || l.name
    if (input.detail_label !== undefined) l.sub_label = input.detail_label
    if (input.items !== undefined) l.items = keep.byId(this.items(input.items, () => crypto.randomUUID()), l.items)
    await this.repos.lists.put(l)
    return this.get(l.id)
  }

  private items(xs: ListItemInput[] = [], newId: (i: number) => string) {
    return xs.map((it, i) => ({ id: it.id || newId(i), title: it.title, sub: it.detail || undefined })).filter((it) => it.title)
  }
}
