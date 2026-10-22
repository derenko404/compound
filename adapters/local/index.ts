import type { Repositories } from '../../core/ports/repositories'
import { LocalCollectionRepository } from './collection.repository'
import { LocalStore } from './local-store'
import { LocalNoteRepository } from './note.repository'
import { LocalOutboxRepository } from './outbox.repository'
import {
  LocalDayRepository, LocalHabitLogRepository, LocalListProgressRepository, LocalProjectStatusRepository, LocalSettingsRepository, LocalTickRepository,
} from './records.repository'

export { LocalStore, LocalOutboxRepository }

/** Builds every repository over the device's blob. */
export class LocalRepositories {
  static create(store = new LocalStore()): Repositories {
    return {
      topics: new LocalCollectionRepository(store, 'topics'),
      lists: new LocalCollectionRepository(store, 'lists'),
      routines: new LocalCollectionRepository(store, 'routines'),
      habits: new LocalCollectionRepository(store, 'habits'),
      listProgress: new LocalListProgressRepository(store),
      habitLogs: new LocalHabitLogRepository(store),
      days: new LocalDayRepository(store),
      ticks: new LocalTickRepository(store),
      projects: new LocalProjectStatusRepository(store),
      settings: new LocalSettingsRepository(store),
      notes: new LocalNoteRepository(store),
    }
  }
}
