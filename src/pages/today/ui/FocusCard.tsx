import { useNavigate } from '@tanstack/react-router'
import { Pause, Play } from 'lucide-react'
import { List, Row } from '@/shared/ui'
import { LENGTH_LABEL, clock, lengthOf, remaining, timer, useTimer } from '@/features/timer'
import { t } from '@/shared/i18n'

// The focus timer on My day: one row to start or pause a session, which opens the timer itself.
export function FocusCard() {
  const nav = useNavigate()
  const { state, now } = useTimer()
  const running = !!state.endsAt
  const left = remaining(state, now)
  const idle = !running && left === lengthOf(state.length)
  const sub = running ? t.today.timer.left(clock(left))
    : idle ? t.today.timer.ready(LENGTH_LABEL[state.length], Math.round(left / 60_000))
      : t.today.timer.paused(clock(left))
  return (
    <List>
      <Row title={t.today.timer.title} sub={sub} onOpen={() => void nav({ to: '/timer' })}
        check={(
          <button type="button" className="focus-play" aria-pressed={running} aria-label={running ? t.timer.pause : t.timer.start} onClick={running ? timer.pause : timer.begin}>
            {running ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
          </button>
        )} />
    </List>
  )
}
