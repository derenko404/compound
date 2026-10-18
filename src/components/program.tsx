// Program-level views: this week as a strip, and the whole program as one line.
import { WEEKDAYS_SHORT, chapterOf, monthLabel } from '@/lib/content'
import { addDays, keyOf } from '@/lib/dates'
import { Link } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import { dayProgress, monthTask, programPos, quarterPlan, startDate, todayItems } from '@/lib/derive'
import type { Routine, State } from '@/lib/types'
import { useStore } from '@/store/StoreProvider'
import { cvar } from './kit'

// The quarter's focus chapter and what it asks of you this month.
export function FocusCard() {
  const { state } = useStore()
  const today = new Date()
  const pos = programPos(state, today)
  const focus = chapterOf(state, quarterPlan(state, pos.q).focus)
  if (!focus) return null
  const task = monthTask(state, focus.id, pos.m)
  const done = focus.tasks.filter((t) => state.plan[t.id]).length
  return (
    <Link to="/chapters/$ch" params={{ ch: focus.id }} className="focus-card" style={cvar(focus.id)}>
      <div className="focus-head">
        <div>
          <div className="focus-label">Focus this quarter</div>
          <div className="focus-name"><span className="dot" />{focus.name}</div>
        </div>
        <span className="focus-count">{done} of {focus.tasks.length} tasks</span>
        <ChevronRight className="chev" aria-hidden="true" />
      </div>
      {task && (
        <div className="focus-task">
          <div className="focus-label">{today.toLocaleDateString('en-GB', { month: 'long' })}</div>
          <div>{task.text}</div>
        </div>
      )}
    </Link>
  )
}

// Weekly routines that aren't every day: the week's fixed slots (study, light track, project, review).
const weeklySlots = (s: State) =>
  s.routines.filter((r) => r.when.kind === 'weekly' && r.when.days.length < 7).sort((a, b) => a.position - b.position)

const slotName = (r: Routine) => {
  if (r.fill) return { focus: 'Study', light: 'Light', project: 'Project' }[r.fill]
  const w = r.title.replace(/^weekly\s+/i, '').split(/[\s:]/)[0]
  return w.charAt(0).toUpperCase() + w.slice(1)
}

const weekDays = (today: Date) => {
  const monday = addDays(today, -((today.getDay() + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i))
}

// This week's slots as tiles: how many of each are done, and which one is due today.
export function WeekSlots() {
  const { state } = useStore()
  const today = new Date()
  const k = keyOf(today)
  const days = weekDays(today)
  const slots = weeklySlots(state)
  if (!slots.length) return null
  return (
    <div className="slots">
      {slots.map((r) => {
        const on = days.filter((d) => r.when.kind === 'weekly' && r.when.days.includes(d.getDay()))
        const done = on.filter((d) => state.days[keyOf(d)]?.done.includes(r.id)).length
        const dueToday = on.some((d) => keyOf(d) === k) && !state.days[k]?.done.includes(r.id)
        const item = r.fill ? todayItems(state, on.find((d) => keyOf(d) >= k) ?? on[0]).find((x) => x.id === r.id) : undefined
        const ch = item?.ch ?? r.chapter
        return (
          <div key={r.id} className="slot" style={cvar(ch)} data-state={done === on.length ? 'done' : dueToday ? 'due' : 'open'}>
            <span className="dot" />
            <span className="slot-name">{slotName(r)}{item && r.fill !== 'project' ? `, ${chapterOf(state, ch)?.name ?? ''}` : ''}</span>
            <b>{dueToday && done < on.length ? 'Today' : `${done}/${on.length}`}</b>
          </div>
        )
      })}
    </div>
  )
}

// This week, Monday to Sunday: how much of each day got done, and the weekly slot that falls on it.
export function WeekStrip() {
  const { state } = useStore()
  const today = new Date()
  const k = keyOf(today)
  const days = weekDays(today)
  const slotOf = (d: Date) => {
    const r = weeklySlots(state).find((x) => x.when.kind === 'weekly' && x.when.days.includes(d.getDay()))
    return r ? slotName(r) : ''
  }
  return (
    <div className="week-strip">
      {days.map((d) => {
        const dk = keyOf(d)
        const { done, total } = dayProgress(state, d)
        const pct = total ? done / total : 0
        const state_ = dk > k ? 'future' : pct === 1 ? 'full' : pct > 0 ? 'part' : 'empty'
        return (
          <div key={dk} className={`wday${dk === k ? ' today' : ''}`} data-state={state_}>
            <span>{WEEKDAYS_SHORT[d.getDay()]}</span>
            <i style={{ '--pct': `${pct * 100}%` } as React.CSSProperties} aria-label={dk > k ? 'Upcoming' : `${done} of ${total} done`} />
            <small>{slotOf(d) || '\u00a0'}</small>
          </div>
        )
      })}
    </div>
  )
}

// The whole program as one line: a segment per quarter in its focus chapter's colour, and where today falls.

export function ProgramBar() {
  const { state } = useStore()
  const today = new Date()
  const pos = programPos(state, today)
  const start = startDate(state)
  const months = pos.quarters * 3
  // Progress through the program in months, with today's place inside the current month.
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const at = pos.before ? 0 : pos.finished ? months : pos.m + (today.getDate() - 1) / daysInMonth
  const quarters = Array.from({ length: pos.quarters }, (_, i) => i + 1)

  return (
    <div className="journey" role="img" aria-label={pos.before ? `Program starts ${monthLabel(start, 0, true)}` : `Quarter ${pos.q} of ${pos.quarters}`}>
      <div className="journey-track">
        {quarters.map((q) => {
          const fill = Math.min(1, Math.max(0, (at - (q - 1) * 3) / 3))
          const focus = chapterOf(state, quarterPlan(state, q).focus)
          return (
            <span key={q} className="journey-q" style={cvar(focus?.id)} title={`Q${q}${focus ? `: ${focus.name}` : ''}`}>
              <i style={{ width: `${fill * 100}%` }} />
            </span>
          )
        })}
        {!pos.before && !pos.finished && <span className="journey-now" style={{ left: `${(at / months) * 100}%` }} />}
      </div>
      <div className="journey-qs">
        {quarters.map((q) => <span key={q} className={q === pos.q && !pos.before ? 'now' : undefined}>Q{q}</span>)}
      </div>
      <div className="journey-ends">
        <span>{monthLabel(start, 0, true)}</span>
        <span>{monthLabel(start, months - 1, true)}</span>
      </div>
    </div>
  )
}
