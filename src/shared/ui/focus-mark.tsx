import { Crosshair } from 'lucide-react'
import { t } from '@/shared/i18n'

/**
 * The focus topic's mark, a pill with a crosshair in the topic's colour (--c): filled "Focus" on the focus topic.
 * With onSet on another topic it's an outline "Set focus" button that makes it the focus.
 */
export function FocusMark({ onSet }: { onSet?: () => void }) {
  if (onSet) return <button type="button" className="focus-mark" onClick={onSet}><Crosshair aria-hidden="true" />{t.topics.setFocus}</button>
  return <span className="focus-mark on"><Crosshair aria-hidden="true" />{t.topics.focus}</span>
}
