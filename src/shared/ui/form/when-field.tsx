import { useState } from 'react'
import { CalendarDays } from 'lucide-react'
import type { When } from '@core/domain/types'
import { dates } from '@/shared/lib/dates'
import { t } from '@/shared/i18n'
import { ChipMenu } from '../chip-menu'
import { fail } from '../lib/fail'
import { SelectField, TextField } from './fields'
import { WeekdaysField } from './weekdays-field'

// The choices a form can offer: 'today' is a one-off due today, the rest are the When kinds.
export type WhenKind = 'today' | When['kind']

/**
 * Picking when a task is due, for a form. `chip` is the When chip (for the form's chip row), `fields` are what the
 * choice needs (a date, the days of the week, the day of the month), placed where the form wants them, and `value()`
 * is the When picked, or null after fail said what's missing. kinds: the choices offered, in order.
 */
export function useWhenField(initial: When, kinds: WhenKind[]) {
  const today = dates.keyOf(new Date())
  const [kind, setKind] = useState<WhenKind>(() => (kinds.includes('today') && initial.kind === 'once' && initial.date === today ? 'today' : initial.kind))
  const [date, setDate] = useState(initial.kind === 'once' ? initial.date : today)
  const [days, setDays] = useState(initial.kind === 'weekly' ? initial.days : [new Date().getDay()])
  const [monthDay, setMonthDay] = useState(String(initial.kind === 'monthly' ? initial.day : 1))
  const labels: Record<WhenKind, string> = {
    today: t.today.form.todayOnly, once: t.today.form.once, daily: t.today.form.daily, weekly: t.today.form.weekly, monthly: t.today.form.monthly,
  }
  // A saved task may be due in a way this form doesn't offer (once, sent through the API): it stays a choice while editing it.
  const offered = kinds.includes(kind) ? kinds : [...kinds, kind]
  const chip = (
    <ChipMenu<WhenKind> label={t.today.form.when} icon={CalendarDays} value={kind} onChange={setKind}
      groups={[{ options: offered.map((k) => ({ value: k, label: labels[k] })) }]} />
  )
  const fields = (
    <>
      {kind === 'once' && <TextField label={t.today.form.date} type="date" value={date} onChange={setDate} required full />}
      {kind === 'monthly' && (
        <SelectField label={t.today.form.dayOfMonth} value={monthDay} onChange={setMonthDay}
          options={[...Array.from({ length: 28 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) })), { value: '-1', label: t.today.form.lastDay }]} />
      )}
      {kind === 'weekly' && <WeekdaysField value={days} onChange={setDays} />}
    </>
  )
  const value = (): When | null => {
    if (kind === 'weekly' && !days.length) {
      fail(t.today.form.pickDay)
      return null
    }
    switch (kind) {
      case 'today':
        return { kind: 'once', date: today }
      case 'once':
        return { kind: 'once', date }
      case 'weekly':
        return { kind: 'weekly', days }
      case 'monthly':
        return { kind: 'monthly', day: Number(monthDay) }
      case 'daily':
        return { kind: 'daily' }
    }
  }
  return { chip, fields, value }
}
