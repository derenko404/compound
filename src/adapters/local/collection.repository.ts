import type { State } from '../../core/domain/types'
import type { CollectionRepositoryPort } from '../../core/ports/repositories'
import type { LocalStore } from './local-store'

type CollectionKey = 'topics' | 'lists' | 'routines' | 'habits'

/** Topics, lists, routines or habits inside the device's blob. Removing a list also removes its ticks and reviews. */
export class LocalCollectionRepository<K extends CollectionKey> implements CollectionRepositoryPort<State[K][number]> {
  private readonly store: LocalStore
  private readonly key: K

  constructor(store: LocalStore, key: K) {
    this.store = store
    this.key = key
  }

  async all() {
    return this.store.read()[this.key]
  }

  put(item: State[K][number]) {
    return this.store.edit((s) => {
      const xs = s[this.key] as { id: string }[]
      const i = xs.findIndex((x) => x.id === item.id)
      if (i < 0) xs.push(item)
      else xs[i] = item
    })
  }

  remove(id: string) {
    return this.store.edit((s) => {
      ;(s[this.key] as { id: string }[]) = (s[this.key] as { id: string }[]).filter((x) => x.id !== id)
      if (this.key === 'lists') delete s.listProgress[id]
    })
  }
}
