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

/** Builds every Supabase repository for one client, scoped to `userId` when the client bypasses RLS (worker). */
export class SupabaseRepositories {
  static create(db: SupabaseClient, userId?: string): Repositories {
    return {
      topics: new SupabaseJsonCollectionRepository<Topic>('topics', db, userId),
      lists: new SupabaseListRepository(db, userId),
      routines: new SupabaseJsonCollectionRepository<Routine>('routines', db, userId),
      listProgress: new SupabaseListProgressRepository(db, userId),
      habits: new SupabaseHabitRepository(db, userId),
      habitLogs: new SupabaseHabitLogRepository(db, userId),
      days: new SupabaseDayRepository(db, userId),
      ticks: new SupabaseTickRepository(db, userId),
      projects: new SupabaseProjectStatusRepository(db, userId),
      settings: new SupabaseSettingsRepository(db, userId),
      notes: new SupabaseNoteRepository(db, userId),
    }
  }
}
