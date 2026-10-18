/**
 * The app's whole state, read from and written to the repositories. The app changes state through Ops (reduced
 * optimistically on the device); `apply` then saves just what the op touched. Notes aren't part of the state:
 * they're read a page at a time through the note repository.
 */
import { emptyState, type Op, type State } from '../domain/types'
import type { Repositories } from '../ports/repositories'

export class StateService {
  private readonly repos: Repositories

  constructor(repos: Repositories) {
    this.repos = repos
  }

  async load(): Promise<State> {
    const r = this.repos
    const [program, days, plan, projects, topics, lists, listProgress, routines, habits, habitLogs] = await Promise.all([
      r.settings.program(), r.days.all(), r.ticks.all(), r.projects.all(), r.topics.all(), r.lists.all(),
      r.listProgress.all(), r.routines.all(), r.habits.all(), r.habitLogs.all(),
    ])
    return { ...emptyState(), settings: { program }, days, plan, projects, topics, lists, listProgress, routines, habits, habitLogs }
  }

  // Saves what one op changed. `next` is the state after the reducer applied it (settings are saved whole from it).
  async apply(op: Op, next: State): Promise<void> {
    const r = this.repos
    switch (op.type) {
      case 'settings': return r.settings.setProgram(next.settings.program)
      case 'day': return r.days.put(op.day, op.log)
      case 'plan': return r.ticks.set(op.taskId, op.doneAt)
      case 'project': return r.projects.set(op.projectId, op.status)
      case 'putNote': return r.notes.put(op.note)
      case 'deleteNote': return r.notes.remove(op.id)
      case 'listItem': return r.listProgress.set(op.list, op.item, op.progress)
      case 'putTopic': return r.topics.put(op.topic)
      case 'deleteTopic': return r.topics.remove(op.id)
      case 'putList': return r.lists.put(op.list)
      case 'deleteList': return r.lists.remove(op.id)
      case 'putRoutine': return r.routines.put(op.routine)
      case 'deleteRoutine': return r.routines.remove(op.id)
      case 'putHabit': return r.habits.put(op.habit)
      case 'deleteHabit': return r.habits.remove(op.id)
      case 'habitLog': return r.habitLogs.set(op.habit, op.day, op.value)
      case 'batch':
        for (const o of op.ops) await this.apply(o, next)
    }
  }
}
