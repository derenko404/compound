import type { CSSProperties, ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import type { TopicId } from '@core/domain/types'
import { t } from '@/shared/i18n'
import { cvar } from './lib/cvar'
import { clx } from '@/shared/lib/clx'

/**
 * One entry in a list of notes, ideas or finds: a meta line, then the content.
 * onEdit: a click anywhere on the entry opens it (links and buttons inside keep their own action). A › on the
 * right shows it and is the keyboard way in; the entry lights up on hover. remove: edit mode's ⊖ (RemoveButton), on the left.
 */
export const Entry = ({ ch, meta, onEdit, editLabel = t.common.edit, remove, children }: {
  ch?: TopicId | null; meta?: ReactNode; onEdit?: () => void; editLabel?: string; remove?: ReactNode; children: ReactNode
}) => (
  <div className={clx('note', onEdit && 'editable', remove && 'has-remove')} style={ch ? cvar(ch) : { '--c': 'var(--primary)' } as CSSProperties}
    onClick={onEdit ? (e) => { if (!(e.target as HTMLElement).closest('a, button')) onEdit() } : undefined}>
    {remove}
    <div className="min-w-0">
      {meta && <div className="note-meta">{meta}</div>}
      {children}
    </div>
    {onEdit && <button type="button" className="icon-btn" aria-label={editLabel} onClick={onEdit}><ChevronRight aria-hidden="true" /></button>}
  </div>
)
