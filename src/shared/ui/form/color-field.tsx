import { PALETTE } from '@/core/domain/content'
import { t } from '@/shared/i18n'
import { Label } from '../primitives/label'

export function ColorField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="field span-all">
      <Label>{t.nav.edit.colour}</Label>
      <div className="swatches" role="radiogroup" aria-label={t.nav.edit.colour}>
        {PALETTE.map((p) => (
          <button key={p} type="button" role="radio" aria-checked={value === p} aria-label={t.nav.edit.colours[p]} className="swatch" style={{ '--c': `var(--p-${p})` } as React.CSSProperties} onClick={() => onChange(p)} />
        ))}
      </div>
    </div>
  )
}
