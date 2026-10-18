import { useState } from 'react'
import { tone } from '@/shared/ui'
import { ChevronDown } from 'lucide-react'
import { dates } from '@/shared/lib/dates'
import { weekOf } from '@/features/habits'
import { useStore } from '@/shared/store/StoreProvider'
import { t } from '@/shared/i18n'

const W = t.wellbeing
const WEEKDAYS_SHORT = t.nav.weekdaysShort


// Each face: the mouth (and brows for awful) on a round face filled with the mood's colour.
const MOODS = [
  { value: 1, label: W.mood.labels[0], mouth: 'M11.5 26.5 Q18 20 24.5 26.5', brows: 'M9 10.5 L14.5 12.5 M27 10.5 L21.5 12.5' },
  { value: 2, label: W.mood.labels[1], mouth: 'M12 25 Q18 21.5 24 25' },
  { value: 3, label: W.mood.labels[2], mouth: 'M12.5 23.5 H23.5' },
  { value: 4, label: W.mood.labels[3], mouth: 'M11.5 21.5 Q18 28 24.5 21.5' },
  { value: 5, label: W.mood.labels[4], mouth: 'M10.5 20.5 Q18 32 25.5 20.5 Z', filled: true },
]

function MoodFace({ value, label }: { value: number; label?: string }) {
  const m = MOODS[value - 1]
  const ink = 'var(--mood-ink)'
  return (
    <svg className="mood-face" viewBox="0 0 36 36" style={tone(`--mood-${value}`)} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <circle cx="18" cy="18" r="17" fill="var(--c)" />
      <circle cx="12.5" cy="15" r="2.2" fill={ink} />
      <circle cx="23.5" cy="15" r="2.2" fill={ink} />
      {m.brows && <path d={m.brows} stroke={ink} strokeWidth="2.2" strokeLinecap="round" />}
      <path d={m.mouth} stroke={ink} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill={m.filled ? ink : 'none'} />
    </svg>
  )
}

// Today's mood, one tap; the week below. Stored per day (day_logs.mood) for charts later.
export function MoodWidget() {
  const { state, dispatch } = useStore()
  const today = new Date()
  const k = dates.keyOf(today)
  const day = state.days[k] ?? { done: [] }
  const set = (mood: number) => {
    const next = day.mood === mood ? null : mood
    dispatch({ type: 'day', day: k, log: { ...day, mood: next } })
  }
  const [open, setOpen] = useState(false)
  const now = day.mood ? MOODS[day.mood - 1] : null
  const faces = (
    <div className="moods" role="group" aria-label={W.mood.group}>
      {MOODS.map((m) => (
        <button key={m.value} type="button" className="mood-btn" aria-pressed={day.mood === m.value} aria-label={m.label} title={m.label}
          style={tone(`--mood-${m.value}`)} onClick={() => { set(m.value); setOpen(false) }}>
          <MoodFace value={m.value} />
        </button>
      ))}
    </div>
  )
  const week = (
    <div className="mood-week">
      {weekOf(today).map((d) => {
        const v = state.days[dates.keyOf(d)]?.mood
        return (
          <div key={dates.keyOf(d)}>
            <span>{WEEKDAYS_SHORT[d.getDay()]}</span>
            {v ? <MoodFace value={v} label={MOODS[v - 1].label} /> : <span className="mood-empty" role="img" aria-label={W.mood.notLogged} />}
          </div>
        )
      })}
    </div>
  )
  // Not answered today: the question and the faces, highlighted. Answered: one short row; open it to change or see the week.
  if (!now) return (
    <section>
      <div className="hcard ask mood-ask">
        <span className="hcard-name">{W.mood.ask}</span>
        {faces}
      </div>
    </section>
  )
  return (
    <section>
      <div className="hcard mood-card">
        <div className="hcard-head">
          <button type="button" className="hcard-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
            <span className="hcard-mood"><MoodFace value={now.value} /></span>
            <span className="hcard-text">
              <span className="hcard-name">{W.mood.title}<ChevronDown className={open ? 'rotate-180' : undefined} aria-hidden="true" /></span>
              <span className="hcard-sub" style={tone(`--mood-${now.value}`)}>{W.mood.today(now.label)}</span>
            </span>
          </button>
        </div>
        {/* Wide screens show the week beside the header; phones keep it inside, under the faces. */}
        <div className="mood-side">{week}</div>
        {open && (
          <div className="hcard-body">
            {faces}
            {week}
          </div>
        )}
      </div>
    </section>
  )
}
