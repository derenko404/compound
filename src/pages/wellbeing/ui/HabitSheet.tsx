import { useState } from 'react'
import { Label } from '@/shared/ui/primitives/label'
import { nextPosition, uid } from '@core/domain/content'
import { dates } from '@/shared/lib/dates'
import { HABIT_DEFAULTS, HABIT_ORDER, HABIT_UI, START_LABEL } from '@/features/habits'
import type { Habit, HabitType, State } from '@core/domain/types'
import { useStore } from '@/shared/store/StoreProvider'
import { Chip, Chips, FormSheet, TextField, WeekdaysField, fail } from '@/shared/ui'
import { t } from '@/shared/i18n'

const W = t.wellbeing

const singleTaken = (s: State, except?: string) =>
  new Set(s.habits.filter((x) => x.id !== except && HABIT_DEFAULTS[x.type].single).map((x) => x.type))

export function newHabit(s: State): Habit {
  const taken = singleTaken(s)
  const type = HABIT_ORDER.find((ty) => !taken.has(ty)) ?? 'build'
  const d = HABIT_DEFAULTS[type]
  return {
    id: uid(), type, name: d.name, why: null, start_date: dates.keyOf(new Date()), days: d.days, position: nextPosition(s.habits),
    custom_data: d.data, created_at: new Date().toISOString(),
  }
}

// The + picker: ready-made trackers (one each, with their own screens and content), then the ones you name yourself.
const PICK_GROUPS: { label: string; types: HabitType[] }[] = [
  { label: W.form.readyMade, types: ['gym', 'water', 'smoking'] },
  { label: W.form.yourOwn, types: ['build', 'break'] },
]

const num = (v: string) => (v === '' ? undefined : Number(v))

export function HabitSheet({ habit, ...sheet }: { habit: Habit; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { state, dispatch } = useStore()
  const isNew = !state.habits.some((x) => x.id === habit.id)
  const [h, setH] = useState(habit)
  const set = (patch: Partial<Habit>) => setH({ ...h, ...patch })
  const setData = (patch: Partial<Habit['custom_data']>) => set({ custom_data: { ...h.custom_data, ...patch } })
  const pick = (type: HabitType) => {
    const d = HABIT_DEFAULTS[type]
    setH({ ...h, type, name: d.name, days: d.days, custom_data: d.data })
  }
  const taken = singleTaken(state, habit.id)

  return (
    <FormSheet {...sheet} title={isNew ? W.form.new : t.common.editNamed(habit.name)} submit={isNew ? W.form.addTracker : t.common.save}
      onSubmit={() => {
        if (!h.name.trim()) return fail(W.form.nameFirst)
        if (h.type === 'gym' && !h.days.length) return fail(W.form.pickDay)
        dispatch({ type: 'putHabit', habit: { ...h, name: h.name.trim(), why: h.why?.trim() || null } })
      }}>
      {isNew && (
        <div className="field span-all">
          <Label>{W.form.tracker}</Label>
          <div className="pick">
            {PICK_GROUPS.map((g) => {
              const types = g.types.filter((ty) => !taken.has(ty))
              return types.length > 0 && (
                <div key={g.label} className="pick-group" role="group" aria-label={g.label}>
                  <span className="pick-label">{g.label}</span>
                  <Chips className="m-0">
                    {types.map((ty) => {
                      const u = HABIT_UI[ty]
                      return <Chip key={ty} pressed={h.type === ty} onClick={() => pick(ty)} icon={u.icon} tone={u.color}>{u.label}</Chip>
                    })}
                  </Chips>
                </div>
              )
            })}
          </div>
          <span className="text-caption text-muted-foreground">{HABIT_UI[h.type].pitch}</span>
        </div>
      )}
      {/* Ready-made trackers keep their own name. */}
      {!HABIT_DEFAULTS[h.type].single && (
        <TextField label={W.form.name} value={h.name} onChange={(name) => set({ name })} required full autoFocus
          placeholder={h.type === 'break' ? W.form.breakPlaceholder : W.form.buildPlaceholder} />
      )}
      {/* The first field gets the focus: the name, or the reason on a ready-made tracker that has none. */}
      <TextField label={W.form.why} value={h.why ?? ''} onChange={(why) => set({ why })} placeholder={W.form.whyPlaceholder} full autoFocus={!!HABIT_DEFAULTS[h.type].single} />
      <div className="grid2">
        <TextField label={START_LABEL[h.type]} type="date" value={h.start_date ?? ''} onChange={(start_date) => set({ start_date: start_date || null })} />
        {h.type === 'water' && <TextField label={W.form.glassesADay} type="number" value={String(h.custom_data.target ?? '')} onChange={(v) => setData({ target: num(v) })} />}
        {h.type === 'smoking' && <>
          <TextField label={W.form.perDay} type="number" value={String(h.custom_data.per_day ?? '')} onChange={(v) => setData({ per_day: num(v) })} />
          <TextField label={W.form.price} type="number" value={String(h.custom_data.price ?? '')} onChange={(v) => setData({ price: num(v) })} />
        </>}
      </div>
      {h.type === 'gym' && <WeekdaysField value={h.days} onChange={(days) => set({ days })} />}
    </FormSheet>
  )
}
