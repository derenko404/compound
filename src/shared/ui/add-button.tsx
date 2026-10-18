import { Plus } from 'lucide-react'
import { Button } from './primitives/button'

export function AddButton({ label, onClick, variant = 'outline' }: { label: string; onClick: () => void; variant?: 'outline' | 'default' }) {
  return <Button type="button" variant={variant} onClick={onClick}><Plus />{label}</Button>
}
