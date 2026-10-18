/** The small keyed records inside the device's blob: ticks, project status, days, list progress, habit logs, settings. */
import type { DayLog, ListItem, Program, ProjectStatus } from '../../core/domain/types'
import type {
  DayRepositoryPort, HabitLogRepositoryPort, ListProgressRepositoryPort, ProjectStatusRepositoryPort, SettingsRepositoryPort, TickRepositoryPort,
} from '../../core/ports/repositories'
import type { LocalStore } from './local-store'

abstract class LocalRecords {
  protected readonly store: LocalStore

  constructor(store: LocalStore) {
    this.store = store
  }
}

export class LocalTickRepository extends LocalRecords implements TickRepositoryPort {
  async all() {
    return this.store.read().plan
  }

  set(itemId: string, doneAt: string | null) {
    return this.store.edit((s) => {
      if (doneAt) s.plan[itemId] = doneAt
      else delete s.plan[itemId]
    })
  }
}

export class LocalProjectStatusRepository extends LocalRecords implements ProjectStatusRepositoryPort {
  async all() {
    return this.store.read().projects
  }

  set(projectId: string, status: ProjectStatus) {
    return this.store.edit((s) => { s.projects[projectId] = status })
  }
}

export class LocalDayRepository extends LocalRecords implements DayRepositoryPort {
  async all() {
    return this.store.read().days
  }

  put(day: string, log: DayLog) {
    return this.store.edit((s) => { s.days[day] = log })
  }
}

export class LocalListProgressRepository extends LocalRecords implements ListProgressRepositoryPort {
  async all() {
    return this.store.read().listProgress
  }

  set(listId: string, itemId: string, p: ListItem) {
    return this.store.edit((s) => {
      const list = (s.listProgress[listId] ??= {})
      if (p.done_at || p.note) list[itemId] = p
      else delete list[itemId]
    })
  }
}

export class LocalHabitLogRepository extends LocalRecords implements HabitLogRepositoryPort {
  async all() {
    return this.store.read().habitLogs
  }

  set(habitId: string, day: string, value: number | null) {
    return this.store.edit((s) => {
      const log = (s.habitLogs[habitId] ??= {})
      if (value == null) delete log[day]
      else log[day] = value
    })
  }
}

export class LocalSettingsRepository extends LocalRecords implements SettingsRepositoryPort {
  async program() {
    return this.store.read().settings.program
  }

  setProgram(program: Program | undefined) {
    return this.store.edit((s) => { s.settings = { ...s.settings, program } })
  }
}
