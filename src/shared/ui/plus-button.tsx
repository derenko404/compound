import { Plus } from 'lucide-react'
import { t } from '@/shared/i18n'

// The page's create action in the top bar: a tinted "+ Add" capsule (the label names what it adds, for screen readers).
export function PlusButton({ label, onClick }: { label: string; onClick: () => void }) {
  return <button type="button" className="plus-btn" aria-label={label} title={label} onClick={onClick}><Plus aria-hidden="true" /><span>{t.common.add}</span></button>
}
