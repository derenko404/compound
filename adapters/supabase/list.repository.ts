import type { SupabaseClient } from '@supabase/supabase-js'
import type { ListDef } from '../../core/domain/types'
import type { ListRepositoryPort } from '../../core/ports/repositories'
import { SupabaseJsonCollectionRepository } from './json-collection.repository'

/** Lists, kept as JSON. Removing one also removes its ticks and reviews. */
export class SupabaseListRepository extends SupabaseJsonCollectionRepository<ListDef> implements ListRepositoryPort {
  constructor(db: SupabaseClient, userId?: string, at?: string) {
    super('lists', db, userId, at)
  }

  override async remove(id: string) {
    await this.drop({ list_id: id }, 'list_progress')
    await super.remove(id)
  }
}
