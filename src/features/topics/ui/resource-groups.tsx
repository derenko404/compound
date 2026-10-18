import { ExternalLink, BookOpen, FileText, GraduationCap, Headphones, Hammer, Newspaper, PlayCircle, Wrench, Link2 } from 'lucide-react'
import { RESOURCE_KINDS } from '@core/domain/content'
import { links } from '@core/domain/links'
import type { TopicId, Resource, ResourceKind } from '@core/domain/types'
import { Check, Fold, Row, RemoveButton } from '@/shared/ui'
import { t } from '@/shared/i18n'
import { useTick } from '../model/use-tick'
import { Linkify } from './linkify'

const KIND_ICON: Record<ResourceKind, typeof BookOpen> = {
  book: BookOpen, course: GraduationCap, video: PlayCircle, article: Newspaper, tool: Wrench,
  doc: FileText, practice: Hammer, podcast: Headphones, other: Link2,
}

/**
 * A resource: tick, the title as a link with ↗, and one quiet line with the note, the site and whether it's free.
 * No type icon: the list is already grouped by type.
 * onEdit: edit mode, where the row opens its form and the title isn't a link.
 */
function ResourceRow({ ch, r, onEdit, onRemove, readOnly }: { ch?: TopicId; r: Resource; onEdit?: (r: Resource) => void; onRemove?: (r: Resource) => void; readOnly?: boolean }) {
  const tick = useTick()
  const words = r.title.split(' ')
  const last = words.pop()
  return (
    <Row ch={ch} done={!readOnly && !onEdit && tick.on(r.id)} onOpen={onEdit && (() => onEdit(r))}
      check={onRemove ? <RemoveButton label={t.common.deleteNamed(r.title)} title={t.common.deleteAsk(r.title)} onConfirm={() => onRemove(r)} /> : readOnly || onEdit ? undefined : <Check on={tick.on(r.id)} label={r.title} onToggle={(v) => tick.set(r.id, v)} />}
      // The last word and the ↗ never split, so the icon can't wrap onto a line of its own.
      title={r.url && !onEdit ? <a href={r.url} target="_blank" rel="noopener" className="res-title">{words.length ? `${words.join(' ')} ` : ''}<span className="whitespace-nowrap">{last}<ExternalLink className="res-ext" aria-label={t.topics.resources.newTab} /></span></a> : r.title}
      // The note on its own line, then where it lives and whether it's free.
      sub={(r.note || r.url || r.free) ? (
        <>
          {r.note && <span className="block"><Linkify text={r.note} /></span>}
          {(r.url || r.free) && <span className="res-meta">{r.url && <span className="res-host">{links.hostOf(r.url)}</span>}{r.free && <span className="res-free">{t.topics.resources.free}</span>}</span>}
        </>
      ) : undefined}
    />
  )
}

/**
 * Resources grouped by type (books, courses, articles…).
 * readOnly: no ticks (someone else's shared topic); ch can then be left out and the colour comes from around it.
 */
export function ResourceGroups({ ch, resources, onEdit, onRemove, readOnly }: { ch?: TopicId; resources: Resource[]; onEdit?: (r: Resource) => void; onRemove?: (r: Resource) => void; readOnly?: boolean }) {
  const tick = useTick()
  const groups = RESOURCE_KINDS.map((k) => ({ ...k, items: resources.filter((r) => (r.kind ?? 'other') === k.id) })).filter((g) => g.items.length)
  return (
    <div className="grid gap-3">
      {groups.map((g, gi) => {
        const done = g.items.filter((r) => tick.on(r.id)).length
        const Icon = KIND_ICON[g.id]
        return (
          <Fold key={g.id} ch={ch} open={gi === 0 || !!onEdit} icon={<Icon className="res-icon" aria-hidden="true" />} title={t.topics.resourceKinds[g.id]} meta={readOnly ? g.items.length : `${done}/${g.items.length}`}>
            {g.items.map((r) => <ResourceRow key={r.id} ch={ch} r={r} onEdit={onEdit} onRemove={onRemove} readOnly={readOnly} />)}
          </Fold>
        )
      })}
    </div>
  )
}
