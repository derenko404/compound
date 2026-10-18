import { useEffect, useRef } from 'react'
import { useStore } from '@/shared/store/StoreProvider'
import { seedOps } from './seed'

/**
 * Fills a new account with the starting roadmap, or replaces content from an older seed version.
 * Returns true while that is pending, so pages never render content in an old shape.
 */
export function useSeed() {
  const { ready, state, dispatch } = useStore()
  const done = useRef(false)
  const pending = ready && seedOps(state).length > 0
  useEffect(() => {
    if (!pending || done.current) return
    done.current = true
    dispatch({ type: 'batch', ops: seedOps(state) })
  }, [pending, state, dispatch])
  return pending
}
