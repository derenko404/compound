// Saving a topic, and blank values for the sheets that create a topic and the things inside it.
import { PALETTE, nextPosition, uid } from '@core/domain/content'
import type { Topic, TopicKind, Project, Resource, Skill } from '@core/domain/types'
import { useStore } from '@/shared/store/StoreProvider'

export function useTopicSave() {
  const { dispatch } = useStore()
  return (c: Topic) => dispatch({ type: 'putTopic', topic: c })
}

export function newTopic(kind: TopicKind, existing: Topic[]): Topic {
  return {
    id: '', kind, position: nextPosition(existing), name: '', color: PALETTE[existing.length % PALETTE.length],
    outcomes: [], projects: [], resources: [], skills: [], created_at: new Date().toISOString(),
  }
}

export const blankProject = (): Project => ({ id: uid(), code: '', name: '' })

export const blankResource = (): Resource => ({ id: uid(), title: '', kind: 'book' })

export const blankSkill = (): Skill => ({ id: uid(), name: '', steps: [] })
