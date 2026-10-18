import { useNavigate } from '@tanstack/react-router'
import type { SearchHit } from '@core/domain/search'

/**
 * Opens what a search result points at: the topic (at the project, or on its resources tab), the list scrolled to
 * the item, Today for a task, Wellbeing for a habit.
 */
export function useOpenHit() {
  const nav = useNavigate()
  return (hit: SearchHit) => {
    switch (hit.kind) {
      case 'topic':
      case 'skill':
      case 'step':
        return nav({ to: '/topics/$ch', params: { ch: hit.topicId! } })
      case 'resource':
        return nav({ to: '/topics/$ch', params: { ch: hit.topicId! }, hash: 'resources' })
      case 'project':
        return nav({ to: '/topics/$ch', params: { ch: hit.topicId! }, hash: hit.code })
      case 'list':
        return nav({ to: '/lists/$id', params: { id: hit.listId! } })
      case 'listItem':
        return nav({ to: '/lists/$id', params: { id: hit.listId! }, hash: `item-${hit.id}` })
      case 'routine':
        return nav({ to: '/today' })
      case 'habit':
        return nav({ to: '/wellbeing' })
    }
  }
}
