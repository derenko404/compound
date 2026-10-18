import type { ListDef } from '@core/domain/types'
import { List, Row, Section } from '@/shared/ui'
import { t } from '@/shared/i18n'

export function ListPreview({ l }: { l: ListDef }) {
  return (
    <Section title={t.topics.shared.items(l.items.length)}>
      <List>{l.items.map((it, i) => <Row key={it.id} title={<><span className="font-normal tabular-nums text-muted-foreground">{i + 1}.</span> {it.title}</>} sub={it.sub} />)}</List>
    </Section>
  )
}
