import type { Habit } from '../../core/domain/types'
import type { HabitRepositoryPort } from '../../core/ports/repositories'
import { SupabaseTable } from './supabase-table'

/** Habits are rows with real columns. */
export class SupabaseHabitRepository extends SupabaseTable implements HabitRepositoryPort {
  protected readonly table = 'habits'

  async all() {
    return (await this.rows(this.own(this.from().select('id, type, name, why, start_date, days, position, custom_data, created_at')))) as Habit[]
  }

  async put({ id, ...h }: Habit) {
    await this.write({ id }, h)
  }

  async remove(id: string) {
    await this.drop({ id })
  }
}
