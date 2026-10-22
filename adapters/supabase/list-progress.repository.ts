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
    const key = { list_id: listId, item_id: itemId }
    if (p.done_at || p.note) await this.write(key, { done_at: p.done_at ?? null, note: p.note ?? null })
    else await this.drop(key)
  }
}
