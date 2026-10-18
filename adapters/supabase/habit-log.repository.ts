import type { HabitLogRepositoryPort } from '../../core/ports/repositories'
import { SupabaseTable } from './supabase-table'

/** One number per habit per day. */
export class SupabaseHabitLogRepository extends SupabaseTable implements HabitLogRepositoryPort {
  protected readonly table = 'habit_logs'

  async all() {
    const out: Record<string, Record<string, number>> = {}
    for (const l of await this.rows(this.own(this.from().select('habit_id, day, value')))) (out[l.habit_id] ??= {})[l.day] = l.value
    return out
  }

  async set(habitId: string, day: string, value: number | null) {
    if (value == null) this.check(await this.own(this.from().delete().eq('habit_id', habitId).eq('day', day)))
    else this.check(await this.from().upsert(this.mine({ habit_id: habitId, day, value })))
  }
}
