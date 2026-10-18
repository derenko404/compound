import type { SearchHit, SearchKind } from '@core/domain/search'
import { List, Row, Section } from '@/shared/ui'
import { t } from '@/shared/i18n'

const ORDER: SearchKind[] = ['topic', 'project', 'skill', 'step', 'resource', 'list', 'listItem', 'routine', 'habit']
// Each group shows this many; more means the query should be narrower.
const PER_GROUP = 8

/** Search results grouped by kind (topics, projects, steps…), each row opening its result. */
export function SearchResults({ hits, onPick }: { hits: SearchHit[]; onPick: (hit: SearchHit) => void }) {
  return (
    <>
      {ORDER.map((kind) => {
        const group = hits.filter((h) => h.kind === kind)
        if (!group.length) return null
        return (
          <Section key={kind} title={t.search.kinds[kind]} aside={group.length > PER_GROUP ? String(group.length) : undefined}>
            <List>
              {group.slice(0, PER_GROUP).map((h) => (
                <Row key={`${h.kind}-${h.id}`} ch={h.topicId} title={h.title} sub={h.detail} onOpen={() => onPick(h)} />
              ))}
            </List>
          </Section>
        )
      })}
    </>
  )
}
