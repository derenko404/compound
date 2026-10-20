import { FastForward, Footprints, Hammer, RotateCcw, type LucideIcon } from 'lucide-react'
import type { Slot } from '../model/derive'
import { t } from '@/shared/i18n'

/**
 * Rows from the topics: what each kind is called, its colour token and its icon, wherever it shows (Today's rows
 * carry the icon on the right with the name as a tooltip, a topic's header uses the name in colour).
 */
export const SLOT_UI: Record<Slot, { label: string; color: string; icon: LucideIcon }> = {
  focus: { label: t.today.slot.focus, color: '--slot-focus', icon: Footprints },
  light: { label: t.today.slot.light, color: '--slot-light', icon: Footprints },
  project: { label: t.today.slot.project, color: '--slot-project', icon: Hammer },
  review: { label: t.today.slot.review, color: '--slot-review', icon: RotateCcw },
  catchup: { label: t.today.slot.catchup, color: '--slot-catchup', icon: FastForward },
}
