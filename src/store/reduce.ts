import type { Op, State } from '@core/domain/types'

const put = <T extends { id: string }>(xs: T[], x: T) => (xs.some((y) => y.id === x.id) ? xs.map((y) => (y.id === x.id ? x : y)) : [...xs, x])

export function reduce(s: State, op: Op): State {
  switch (op.type) {
    case 'settings':
      return { ...s, settings: { ...s.settings, ...op.patch } }
    case 'day':
      return { ...s, days: { ...s.days, [op.day]: op.log } }
    case 'plan': {
      const plan = { ...s.plan }
      if (op.doneAt) plan[op.taskId] = op.doneAt
      else delete plan[op.taskId]
      return { ...s, plan }
    }
    case 'project':
      return { ...s, projects: { ...s.projects, [op.projectId]: op.status } }
    case 'putNote':
      return { ...s, notes: s.notes.some((n) => n.id === op.note.id) ? s.notes.map((n) => (n.id === op.note.id ? op.note : n)) : [op.note, ...s.notes] }
    case 'deleteNote':
      return { ...s, notes: s.notes.filter((n) => n.id !== op.id) }
    case 'putTopic':
      return { ...s, topics: put(s.topics, op.topic) }
    case 'deleteTopic':
      return { ...s, topics: s.topics.filter((c) => c.id !== op.id) }
    case 'putList':
      return { ...s, lists: put(s.lists, op.list) }
    case 'deleteList': {
      const listProgress = { ...s.listProgress }
      delete listProgress[op.id]
      return { ...s, lists: s.lists.filter((l) => l.id !== op.id), listProgress }
    }
    case 'listItem': {
      const list = { ...s.listProgress[op.list] }
      if (op.progress.done_at || op.progress.note) list[op.item] = op.progress
      else delete list[op.item]
      return { ...s, listProgress: { ...s.listProgress, [op.list]: list } }
    }
    case 'putRoutine':
      return { ...s, routines: put(s.routines, op.routine) }
    case 'deleteRoutine':
      return { ...s, routines: s.routines.filter((r) => r.id !== op.id) }
    case 'putHabit':
      return { ...s, habits: put(s.habits, op.habit) }
    case 'deleteHabit': {
      const habitLogs = { ...s.habitLogs }
      delete habitLogs[op.id]
      return { ...s, habits: s.habits.filter((h) => h.id !== op.id), habitLogs }
    }
    case 'habitLog': {
      const log = { ...s.habitLogs[op.habit] }
      if (op.value == null) delete log[op.day]
      else log[op.day] = op.value
      return { ...s, habitLogs: { ...s.habitLogs, [op.habit]: log } }
    }
    case 'batch':
      return op.ops.reduce(reduce, s)
  }
}
