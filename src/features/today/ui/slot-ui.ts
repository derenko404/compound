import type { Slot } from '../model/derive'
import { t } from '@/shared/i18n'

// Rows from the topics: what each kind is called and its colour token (a topic's header shows the name in colour).
export const SLOT_UI: Record<Slot, { label: string; color: string }> = {
  focus: { label: t.today.slot.focus, color: '--slot-focus' },
  light: { label: t.today.slot.light, color: '--slot-light' },
  project: { label: t.today.slot.project, color: '--slot-project' },
  review: { label: t.today.slot.review, color: '--slot-review' },
  catchup: { label: t.today.slot.catchup, color: '--slot-catchup' },
}
