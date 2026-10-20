import { dates } from '@/shared/lib/dates'
import { useStore } from '@/shared/store/StoreProvider'

/**
 * Today's ticks: tasks (routines and topic tasks) are ticked into the day's log under their ids, on Today and on
 * a topic's page alike. set returns the log after the tick, for whoever reacts to it (Today's confetti).
 */
export function useDayTick() {
  const { state, dispatch } = useStore()
  const day = dates.keyOf(new Date())
  const log = state.days[day] ?? { done: [] }
  return {
    day,
    on: (id: string) => log.done.includes(id),
    set: (id: string, on: boolean) => {
      const next = { ...log, done: on ? [...log.done, id] : log.done.filter((x) => x !== id) }
      dispatch({ type: 'day', day, log: next })
      return next
    },
  }
}
