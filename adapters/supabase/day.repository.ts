import type { DayLog } from '../../core/domain/types'
import type { DayRepositoryPort } from '../../core/ports/repositories'
import { SupabaseTable } from './supabase-table'

/** Each day's routine ticks and mood. */
export class SupabaseDayRepository extends SupabaseTable implements DayRepositoryPort {
  protected readonly table = 'day_logs'

  async all() {
    const out: Record<string, DayLog> = {}
    for (const d of await this.rows(this.own(this.from().select('*')))) out[d.day] = { done: d.done, mood: d.mood }
    return out
  }

  async put(day: string, log: DayLog) {
    await this.write({ day }, { done: log.done, mood: log.mood ?? null })
  }
}
