import { normalizeState } from '../domain/content'
import { emptyState, type Note, type Op, type State } from '../domain/types'
import type { Repositories } from '../ports/repositories'
import { StateService } from './state.service'

/**
 * Settings → Backup: everything as one JSON file (the state plus every note), and importing such a file into the
 * repositories, item by item (merged by id with what's there). It's also how device-only data moves to an account:
 * export before signing in, import after.
 */
export class BackupService {
  private readonly repos: Repositories
  private readonly state: StateService

  constructor(repos: Repositories) {
    this.repos = repos
    this.state = new StateService(repos)
  }

  // Notes are paged, so they're fetched here 500 at a time.
  async export(s: State) {
    const notes: Note[] = []
    while (true) {
      const page = await this.repos.notes.page({}, notes.length, 500)
      notes.push(...page)
      if (page.length < 500) break
    }
    return { app: 'compound', exported_at: new Date().toISOString(), state: { ...s, notes } }
  }

  // Reads a file made by export. Files from before the rename say 'roadmap-log'.
  static parse(text: string): State {
    const j = JSON.parse(text)
    const s = j?.app === 'compound' || j?.app === 'roadmap-log' ? j.state : j
    if (!s || typeof s !== 'object' || !('days' in s)) throw new Error('Not a Compound export')
    return normalizeState({ ...emptyState(), ...s })
  }

  // Writes every item of `s` (an imported file).
  async import(s: State) {
    for (const op of this.ops(s)) await this.state.apply(op, s)
  }

  private ops(s: State): Op[] {
    const ops: Op[] = [{ type: 'settings', patch: s.settings }]
    for (const [day, log] of Object.entries(s.days)) ops.push({ type: 'day', day, log })
    for (const [taskId, doneAt] of Object.entries(s.plan)) ops.push({ type: 'plan', taskId, doneAt })
    for (const [projectId, status] of Object.entries(s.projects)) ops.push({ type: 'project', projectId, status })
    for (const note of s.notes) ops.push({ type: 'putNote', note })
    for (const [list, items] of Object.entries(s.listProgress))
      for (const [item, progress] of Object.entries(items)) ops.push({ type: 'listItem', list, item, progress })
    for (const topic of s.topics) ops.push({ type: 'putTopic', topic })
    for (const list of s.lists) ops.push({ type: 'putList', list })
    for (const routine of s.routines) ops.push({ type: 'putRoutine', routine })
    for (const habit of s.habits) ops.push({ type: 'putHabit', habit })
    for (const [habit, log] of Object.entries(s.habitLogs))
      for (const [day, value] of Object.entries(log)) ops.push({ type: 'habitLog', habit, day, value })
    return ops
  }
}
