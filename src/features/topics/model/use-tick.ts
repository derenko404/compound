import { useStore } from '@/shared/store/StoreProvider'

// Step and resource ticks live in the same progress table as plan tasks, under their item ids.
export function useTick() {
  const { state, dispatch } = useStore()
  return {
    on: (id: string) => !!state.plan[id],
    set: (id: string, on: boolean) => {
      dispatch({ type: 'plan', taskId: id, doneAt: on ? new Date().toISOString() : null })
    },
  }
}
