import type { SupabaseClient } from '@supabase/supabase-js'
import type { ListDef } from '../../core/domain/types'
import type { ListRepositoryPort } from '../../core/ports/repositories'
import { SupabaseJsonCollectionRepository } from './json-collection.repository'

/** Lists, kept as JSON. Removing one also removes its ticks and reviews. */
export class SupabaseListRepository extends SupabaseJsonCollectionRepository<ListDef> implements ListRepositoryPort {
  constructor(db: SupabaseClient, userId?: string) {
    super('lists', db, userId)
  }

  override async remove(id: string) {
    this.check(await this.own(this.from('list_progress').delete().eq('list_id', id)))
    await super.remove(id)
  }
}
