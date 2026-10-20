import type { CSSProperties } from 'react'
import { PALETTE } from '@core/domain/content'
import { t } from '@/shared/i18n'
import { Dot } from '../dot'
import { SelectField } from './fields'

// A topic's colour: a select of the palette, each choice as its dot and name.
export function ColorField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <SelectField label={t.nav.edit.colour} value={value} onChange={onChange}
      options={PALETTE.map((p) => ({
        value: p,
        label: <span className="select-color" style={{ '--c': `var(--p-${p})` } as CSSProperties}><Dot />{t.nav.edit.colours[p]}</span>,
      }))} />
  )
}
