import type { Repositories } from '../ports/repositories'
import { FocusService } from './focus.service'
import { HabitService } from './habit.service'
import { ListService } from './list.service'
import { NoteService } from './note.service'
import { RoutineService } from './routine.service'
import { TopicService } from './topic.service'

export { ApiTokenService } from './api-token.service'
export { StateService } from './state.service'
export type * from './inputs'

/** Every domain service for one user's repositories. */
export class Services {
  readonly topics: TopicService
  readonly lists: ListService
  readonly routines: RoutineService
  readonly notes: NoteService
  readonly habits: HabitService
  readonly focus: FocusService

  constructor(repos: Repositories) {
    this.topics = new TopicService(repos)
    this.lists = new ListService(repos)
    this.routines = new RoutineService(repos)
    this.notes = new NoteService(repos)
    this.habits = new HabitService(repos)
    this.focus = new FocusService(repos)
  }
}
