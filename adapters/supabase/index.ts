import type { SupabaseClient } from '@supabase/supabase-js'
import type { Routine, Topic } from '../../core/domain/types'
import type { Repositories } from '../../core/ports/repositories'
import { SupabaseDayRepository } from './day.repository'
import { SupabaseHabitLogRepository } from './habit-log.repository'
import { SupabaseHabitRepository } from './habit.repository'
import { SupabaseJsonCollectionRepository } from './json-collection.repository'
import { SupabaseListProgressRepository } from './list-progress.repository'
import { SupabaseListRepository } from './list.repository'
import { SupabaseNoteRepository } from './note.repository'
import { SupabaseProjectStatusRepository } from './project-status.repository'
import { SupabaseSettingsRepository } from './settings.repository'
import { SupabaseTickRepository } from './tick.repository'

/**
 * Builds every Supabase repository for one client, scoped to `userId` when the client bypasses RLS (worker).
 * `at` replays a change made at that time on the device: it's written only over older rows (latest edit wins).
 */
export class SupabaseRepositories {
  static create(db: SupabaseClient, userId?: string, at?: string): Repositories {
    return {
      topics: new SupabaseJsonCollectionRepository<Topic>('topics', db, userId, at),
      lists: new SupabaseListRepository(db, userId, at),
      routines: new SupabaseJsonCollectionRepository<Routine>('routines', db, userId, at),
      listProgress: new SupabaseListProgressRepository(db, userId, at),
      habits: new SupabaseHabitRepository(db, userId, at),
      habitLogs: new SupabaseHabitLogRepository(db, userId, at),
      days: new SupabaseDayRepository(db, userId, at),
      ticks: new SupabaseTickRepository(db, userId, at),
      projects: new SupabaseProjectStatusRepository(db, userId, at),
      settings: new SupabaseSettingsRepository(db, userId, at),
      notes: new SupabaseNoteRepository(db, userId, at),
    }
  }
}
