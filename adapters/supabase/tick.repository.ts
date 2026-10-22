import type { TickRepositoryPort } from '../../core/ports/repositories'
import { SupabaseTable } from './supabase-table'

/** Ticks on steps and resources (table plan_progress). */
export class SupabaseTickRepository extends SupabaseTable implements TickRepositoryPort {
  protected readonly table = 'plan_progress'

  async all() {
    const out: Record<string, string> = {}
    for (const p of await this.rows(this.own(this.from().select('*')))) out[p.task_id] = p.done_at
    return out
  }

  async set(itemId: string, doneAt: string | null) {
    if (doneAt) await this.write({ task_id: itemId }, { done_at: doneAt })
    else await this.drop({ task_id: itemId })
  }
}
