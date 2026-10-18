import type { ListItem } from '../../core/domain/types'
import type { ListProgressRepositoryPort } from '../../core/ports/repositories'
import { SupabaseTable } from './supabase-table'

/** Per list item: when it was ticked and the user's review. */
export class SupabaseListProgressRepository extends SupabaseTable implements ListProgressRepositoryPort {
  protected readonly table = 'list_progress'

  async all() {
    const out: Record<string, Record<string, ListItem>> = {}
    for (const p of await this.rows(this.own(this.from().select('*')))) (out[p.list_id] ??= {})[p.item_id] = { done_at: p.done_at, note: p.note }
    return out
  }

  async set(listId: string, itemId: string, p: ListItem) {
    if (p.done_at || p.note) this.check(await this.from().upsert(this.mine({ list_id: listId, item_id: itemId, done_at: p.done_at ?? null, note: p.note ?? null })))
    else this.check(await this.own(this.from().delete().eq('list_id', listId).eq('item_id', itemId)))
  }
}
