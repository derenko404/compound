// Saving a topic, and blank values for the sheets that create a topic and the things inside it.
import { PALETTE, nextPosition, uid } from '@core/domain/content'
import type { Topic, TopicKind, Project, Resource, Skill, Task } from '@core/domain/types'
import { useStore } from '@/shared/store/StoreProvider'

export function useTopicSave() {
  const { dispatch } = useStore()
  return (c: Topic) => dispatch({ type: 'putTopic', topic: c })
}

// A new topic opens with a random colour, one no topic uses yet while there are any left.
export function newTopic(kind: TopicKind, existing: Topic[]): Topic {
  const free = PALETTE.filter((p) => !existing.some((c) => c.color === p))
  const pool = free.length ? free : PALETTE
  return {
    id: '', kind, position: nextPosition(existing), name: '', color: pool[Math.floor(Math.random() * pool.length)],
    outcomes: [], projects: [], resources: [], skills: [], tasks: [], created_at: new Date().toISOString(),
  }
}

export const blankProject = (): Project => ({ id: uid(), code: '', name: '' })

export const blankResource = (): Resource => ({ id: uid(), title: '', kind: 'book' })

export const blankSkill = (): Skill => ({ id: uid(), name: '', steps: [] })

export const blankTask = (): Task => ({ id: uid(), title: '', when: { kind: 'daily' } })
