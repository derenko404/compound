import { ChevronRight } from 'lucide-react'

// The › on every habit row: opens the habit's log sheet. A button, so a tap on it never ticks the row.
export function HabitDetails({ label, onOpen }: { label: string; onOpen: () => void }) {
  return <button type="button" className="icon-btn row-btn" aria-label={label} onClick={onOpen}><ChevronRight aria-hidden="true" /></button>
}
