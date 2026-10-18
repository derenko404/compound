import { t } from '@/shared/i18n'
import { Label } from '../primitives/label'

// The days of the week as one row of seven equal buttons, Monday first. Never wraps.
export function WeekdaysField({ value, onChange }: { value: number[]; onChange: (v: number[]) => void }) {
  const order = [1, 2, 3, 4, 5, 6, 0]
  return (
    <div className="field span-all">
      <Label>{t.nav.edit.days}</Label>
      <div className="segmented" role="group" aria-label={t.nav.edit.days} style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
        {order.map((d) => (
          <button key={d} type="button" className="segment" aria-pressed={value.includes(d)}
            onClick={() => onChange(value.includes(d) ? value.filter((x) => x !== d) : [...value, d].sort())}>
            {t.nav.weekdaysShort[d]}
          </button>
        ))}
      </div>
    </div>
  )
}
