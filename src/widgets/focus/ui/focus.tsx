// Roadmap views for Today: the focus topic, and this week as a strip.
import { topicOf } from '@/core/domain/content'
import { addDays, keyOf } from '@/shared/lib/dates'
import { Link } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import { currentProject, dayProgress, focusOf, nextUp, topicProgress, weekdayShort } from '@/entities/today'
import { t } from '@/shared/i18n'
import { useStore } from '@/shared/store/StoreProvider'
import { cvar } from '@/shared/ui/kit'

// The focus topic: which skill you're on, the next few steps, and the project in progress.
export function FocusCard() {
  const { state } = useStore()
  const focus = topicOf(state, focusOf(state))
  if (!focus) return (
    <Link to="/topics" className="focus-card">
      <div className="focus-label">{t.today.focus.label}</div>
      <div className="muted text-small">{t.today.focus.none}</div>
    </Link>
  )
  const { done, total } = topicProgress(state, focus)
  const next = nextUp(state, focus)
  const upcoming = next ? next.skill.steps.filter((t) => !state.plan[t.id]).slice(0, 3) : []
  const project = currentProject(state, focus)
  return (
    <Link to="/topics/$ch" params={{ ch: focus.id }} className="focus-card" style={cvar(focus.id)}>
      <div className="focus-head">
        <div>
          <div className="focus-label">{t.today.focus.label}</div>
          <div className="focus-name"><span className="dot" />{focus.name}</div>
        </div>
        <span className="focus-count">{t.today.focus.steps(done, total)}</span>
        <ChevronRight className="chev" aria-hidden="true" />
      </div>
      {next ? (
        <div className="focus-task">
          <div className="focus-label">{t.today.focus.skillOf(next.index + 1, focus.skills.length, next.skill.name)}</div>
          <ol className="focus-next">{upcoming.map((t) => <li key={t.id}>{t.text}</li>)}</ol>
        </div>
      ) : <div className="focus-task">{t.today.focus.allDone}</div>}
      {project && (
        <div className="focus-task">
          <div className="focus-label">{(state.projects[project.id] ?? 'todo') === 'doing' ? t.today.focus.projectDoing : t.today.focus.projectNext}</div>
          <div><b>{project.code}</b> {project.name}</div>
        </div>
      )}
    </Link>
  )
}

const weekDays = (today: Date) => {
  const monday = addDays(today, -((today.getDay() + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i))
}

// This week, Monday to Sunday: how much of each day got done, as a ring and as done/total.
export function WeekStrip() {
  const { state } = useStore()
  const today = new Date()
  const k = keyOf(today)
  const days = weekDays(today)
  return (
    <div className="week-strip">
      {days.map((d) => {
        const dk = keyOf(d)
        const { done, total } = dayProgress(state, d)
        const pct = total ? done / total : 0
        const state_ = dk > k ? 'future' : pct === 1 ? 'full' : pct > 0 ? 'part' : 'empty'
        return (
          <div key={dk} className={`wday${dk === k ? ' today' : ''}`} data-state={state_}>
            <span>{weekdayShort(d.getDay())}</span>
            <i style={{ '--pct': `${pct * 100}%` } as React.CSSProperties} aria-label={dk > k ? t.today.week.upcoming : t.today.week.doneOf(done, total)} />
            <small aria-hidden="true">{total ? `${done}/${total}` : '–'}</small>
          </div>
        )
      })}
    </div>
  )
}
