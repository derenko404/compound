import type { Habit } from '../../core/domain/types'
import type { HabitRepositoryPort } from '../../core/ports/repositories'
import { SupabaseTable } from './supabase-table'

/** Habits are rows with real columns. */
export class SupabaseHabitRepository extends SupabaseTable implements HabitRepositoryPort {
  protected readonly table = 'habits'

  async all() {
    return (await this.rows(this.own(this.from().select('id, type, name, why, start_date, days, position, custom_data, created_at')))) as Habit[]
  }

  async put(h: Habit) {
    this.check(await this.from().upsert(this.mine({ ...h, updated_at: this.now() })))
  }

  async remove(id: string) {
    this.check(await this.own(this.from().delete().eq('id', id)))
  }
}
