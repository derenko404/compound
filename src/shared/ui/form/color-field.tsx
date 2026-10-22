import type { CSSProperties } from 'react'
import { Check } from 'lucide-react'
import { PALETTE } from '@core/domain/content'
import { t } from '@/shared/i18n'
import { Field } from './fields'

// A topic's colour, as in iOS Reminders: the palette as circles, the chosen one ringed with a tick.
export function ColorField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Field label={t.nav.edit.colour} full>
      {(id) => (
        <div id={id} className="swatches" role="radiogroup" aria-label={t.nav.edit.colour}>
          {PALETTE.map((p) => (
            <button key={p} type="button" role="radio" aria-checked={value === p} aria-label={t.nav.edit.colours[p]} title={t.nav.edit.colours[p]}
              className="swatch" style={{ '--c': `var(--p-${p})` } as CSSProperties} onClick={() => onChange(p)}>
              {value === p && <Check aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </Field>
  )
}
