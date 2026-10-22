import { topics } from '@core/domain/content'
import type { TopicId, State } from '@core/domain/types'
import { t } from '@/shared/i18n'
import { useStore } from '@/shared/store/StoreProvider'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from '../primitives/select'
import { Dot } from '../dot'
import { NativeSelect } from '../native-select'
import { useTouch } from '../lib/use-touch'
import { Field } from './fields'

// Personal (and other general topics) first, then the roadmap topics, then wellbeing habits.
export function TopicSelect({ id, value, onChange, state, allowNone }: {
  id?: string; value: TopicId | null; onChange: (c: TopicId | null) => void; state: State; allowNone?: string
}) {
  const groups = [
    { label: '', items: topics(state, 'general') },
    { label: t.nav.edit.topics, items: topics(state, 'learn') },
  ].filter((g) => g.items.length)
  // Touch devices get the system picker (groups, no colour dots).
  if (useTouch()) return (
    <NativeSelect id={id} value={value ?? 'none'} onChange={(v) => onChange(v === 'none' ? null : v)} className="w-full" groups={[
      ...(allowNone ? [{ options: [{ value: 'none', label: allowNone }] }] : []),
      ...groups.map((g) => ({ label: g.label || undefined, options: g.items.map((c) => ({ value: c.id, label: c.name })) })),
    ]} />
  )
  return (
    <Select value={value ?? 'none'} onValueChange={(v) => onChange(v === 'none' ? null : v)}>
      <SelectTrigger id={id} className="w-full"><SelectValue /></SelectTrigger>
      <SelectContent>
        {allowNone && <SelectItem value="none">{allowNone}</SelectItem>}
        {groups.map((g, i) => (
          <SelectGroup key={g.label || 'general'}>
            {(i > 0 || allowNone) && <SelectSeparator />}
            {g.label && <SelectLabel>{g.label}</SelectLabel>}
            {g.items.map((c) => <SelectItem key={c.id} value={c.id}><Dot ch={c.id} />{c.name}</SelectItem>)}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  )
}

export const TopicField = ({ label = t.nav.edit.topic, value, onChange, allowNone }: { label?: string; value: TopicId | null; onChange: (c: TopicId | null) => void; allowNone?: string }) => {
  const { state } = useStore()
  return <Field label={label}>{(id) => <TopicSelect id={id} state={state} value={value} onChange={onChange} allowNone={allowNone} />}</Field>
}
