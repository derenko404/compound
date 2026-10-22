import { useEffect, useRef } from 'react'
import { onTimerDone } from '@/features/timer'
import { dates } from '@/shared/lib/dates'
import { useStore } from '@/shared/store/StoreProvider'
import { started, valueOn } from './habits'

// A finished timer session adds its minutes to today's meditation, when there is a meditation tracker.
export function useTimerMeditation() {
  const { state, ready, dispatch } = useStore()
  const latest = useRef(state)
  useEffect(() => { latest.current = state })
  useEffect(() => {
    if (!ready) return
    return onTimerDone((minutes) => {
      const s = latest.current
      const today = new Date()
      const h = s.habits.find((x) => x.type === 'meditation')
      if (!h || !started(h, today)) return
      const k = dates.keyOf(today)
      dispatch({ type: 'habitLog', habit: h.id, day: k, value: (valueOn(s, h, k) ?? 0) + minutes })
    })
  }, [ready, dispatch])
}
