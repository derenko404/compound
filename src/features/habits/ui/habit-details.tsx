import { Ellipsis } from 'lucide-react'

// The same small round ⋯ on every habit row: opens the habit's log sheet. A button, so it never ticks the row.
export function HabitDetails({ label, onOpen }: { label: string; onOpen: () => void }) {
  return <button type="button" className="icon-btn row-btn" aria-label={label} onClick={onOpen}><Ellipsis aria-hidden="true" /></button>
}
