// Roadmap views for Today: the focus track, and this week as a strip.
import { WEEKDAYS_SHORT, chapterOf } from '@/lib/content'
import { addDays, keyOf } from '@/lib/dates'
import { Link } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import { currentProject, dayProgress, focusOf, nextUp, trackProgress } from '@/lib/derive'
import { useStore } from '@/store/StoreProvider'
import { cvar } from './kit'

// The focus track: which skill you're on, the next few topics, and the project in progress.
export function FocusCard() {
  const { state } = useStore()
  const focus = chapterOf(state, focusOf(state))
  if (!focus) return (
    <Link to="/tracks" className="focus-card">
      <div className="focus-label">Focus</div>
      <div className="muted text-small">No focus track yet. Pick one on Tracks: it gets the study sessions and the weekend project.</div>
    </Link>
  )
  const { done, total } = trackProgress(state, focus)
  const next = nextUp(state, focus)
  const upcoming = next ? next.skill.topics.filter((t) => !state.plan[t.id]).slice(0, 3) : []
  const project = currentProject(state, focus)
  return (
    <Link to="/tracks/$ch" params={{ ch: focus.id }} className="focus-card" style={cvar(focus.id)}>
      <div className="focus-head">
        <div>
          <div className="focus-label">Focus</div>
          <div className="focus-name"><span className="dot" />{focus.name}</div>
        </div>
        <span className="focus-count">{done} of {total} topics</span>
        <ChevronRight className="chev" aria-hidden="true" />
      </div>
      {next ? (
        <div className="focus-task">
          <div className="focus-label">Skill {next.index + 1} of {focus.skills.length}: {next.skill.name}</div>
          <ol className="focus-next">{upcoming.map((t) => <li key={t.id}>{t.text}</li>)}</ol>
        </div>
      ) : <div className="focus-task">Every skill on this track is done.</div>}
      {project && (
        <div className="focus-task">
          <div className="focus-label">{(state.projects[project.id] ?? 'todo') === 'doing' ? 'Project in progress' : 'Next project'}</div>
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
            <span>{WEEKDAYS_SHORT[d.getDay()]}</span>
            <i style={{ '--pct': `${pct * 100}%` } as React.CSSProperties} aria-label={dk > k ? 'Upcoming' : `${done} of ${total} done`} />
            <small aria-hidden="true">{total ? `${done}/${total}` : '–'}</small>
          </div>
        )
      })}
    </div>
  )
}
