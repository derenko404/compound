import { Search, X } from 'lucide-react'
import { t } from '@/shared/i18n'
import { Input } from './primitives/input'

// A compact search box: icon inside, no visible label (screen readers still get one), clear button once typed.
export function SearchField({ value, onChange, placeholder = t.nav.kit.search, label = t.nav.kit.search, className, autoFocus }: {
  value: string; onChange: (v: string) => void; placeholder?: string; label?: string; className?: string; autoFocus?: boolean
}) {
  return (
    <div className={`search${className ? ` ${className}` : ''}`}>
      <Search className="search-icon" aria-hidden="true" />
      <Input type="search" aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoFocus={autoFocus} />
      {value && <button type="button" className="icon-btn search-clear" aria-label={t.nav.kit.clearSearch} onClick={() => onChange('')}><X /></button>}
    </div>
  )
}
