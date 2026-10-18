import type { Op, State } from '@/lib/types'

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
    case 'chapterNote':
      return { ...s, chapterNotes: { ...s.chapterNotes, [op.chapter]: op.body } }
    case 'addNote':
      return { ...s, notes: [op.note, ...s.notes] }
    case 'deleteNote':
      return { ...s, notes: s.notes.filter((n) => n.id !== op.id) }
    case 'addTask':
      return { ...s, tasks: [op.task, ...s.tasks] }
    case 'deleteTask':
      return { ...s, tasks: s.tasks.filter((t) => t.id !== op.id) }
    case 'addIdea':
      return { ...s, ideas: [op.idea, ...s.ideas] }
    case 'deleteIdea':
      return { ...s, ideas: s.ideas.filter((i) => i.id !== op.id) }
    case 'addIdeaNote':
      return {
        ...s,
        ideas: s.ideas.map((i) => (i.id === op.note.idea_id ? { ...i, notes: [...i.notes, op.note] } : i)),
      }
    case 'listItem': {
      const list = { ...s.lists[op.list] }
      if (op.item.done_at || op.item.note) list[op.idx] = op.item
      else delete list[op.idx]
      return { ...s, lists: { ...s.lists, [op.list]: list } }
    }
    case 'addBookmark':
      return { ...s, bookmarks: [op.bookmark, ...s.bookmarks] }
    case 'deleteBookmark':
      return { ...s, bookmarks: s.bookmarks.filter((b) => b.id !== op.id) }
  }
}
