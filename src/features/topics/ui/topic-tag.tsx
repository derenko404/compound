import { topicOf } from '@core/domain/content'
import type { TopicId } from '@core/domain/types'
import { useStore } from '@/shared/store/StoreProvider'
import { InnerLink } from '@/shared/ui'

// A topic label linking to that topic's page.
export function TopicTag({ ch, label }: { ch: TopicId | null | undefined; label?: string }) {
  const { state } = useStore()
  const c = topicOf(state, ch)
  if (!c) return <>{label ?? ''}</>
  return <InnerLink ch={c.id} to="/topics/$ch" params={{ ch: c.id }}>{label ?? c.name}</InnerLink>
}
