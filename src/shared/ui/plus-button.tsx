import { Plus } from 'lucide-react'

// Round "+" next to a section or page title.
export function PlusButton({ label, onClick }: { label: string; onClick: () => void }) {
  return <button type="button" className="plus-btn" aria-label={label} title={label} onClick={onClick}><Plus /></button>
}
