import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useIsMutating, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Session } from '@supabase/supabase-js'
import { toast } from 'sonner'
import { emptyState, type Op, type State } from '@/lib/types'
import { cloudBackend, localBackend, supabase, type Backend } from './backends'
import { reduce } from './reduce'

export type Mode = 'loading' | 'signin' | 'local' | 'cloud'

interface Auth {
  mode: Mode
  session: Session | null
  backend: Backend | null
  useLocal: () => void
  signOut: () => Promise<void>
}

const AuthCtx = createContext<Auth | null>(null)
const LOCAL_CHOICE = 'roadmap-local-only'

// Decides where data lives: the Supabase account when signed in, otherwise this device.
export function StoreProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [mode, setMode] = useState<Mode>(supabase ? 'loading' : 'local')
  const qc = useQueryClient()

  useEffect(() => {
    if (!supabase) return
    const pick = (sess: Session | null) => {
      setSession(sess)
      setMode(sess ? 'cloud' : localStorage.getItem(LOCAL_CHOICE) ? 'local' : 'signin')
    }
    supabase.auth.getSession().then(({ data }) => pick(data.session))
    const { data } = supabase.auth.onAuthStateChange((event, sess) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') pick(sess)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const backend = useMemo(
    () => (mode === 'cloud' && supabase ? cloudBackend(supabase) : mode === 'local' ? localBackend : null),
    [mode],
  )

  const useLocal = useCallback(() => {
    localStorage.setItem(LOCAL_CHOICE, '1')
    setMode('local')
  }, [])

  const signOut = useCallback(async () => {
    localStorage.removeItem(LOCAL_CHOICE)
    if (supabase) await supabase.auth.signOut()
    qc.removeQueries({ queryKey: ['state'] })
    setMode(supabase ? 'signin' : 'local')
  }, [qc])

  return <AuthCtx.Provider value={{ mode, session, backend, useLocal, signOut }}>{children}</AuthCtx.Provider>
}

export function useAuth() {
  const a = useContext(AuthCtx)
  if (!a) throw new Error('useAuth outside StoreProvider')
  return a
}

const stateKey = (a: Pick<Auth, 'backend' | 'session'>) => ['state', a.backend?.kind ?? 'none', a.session?.user.id ?? 'device'] as const

export function useAppState() {
  const auth = useAuth()
  return useQuery({
    queryKey: stateKey(auth),
    queryFn: () => auth.backend!.load(),
    enabled: !!auth.backend,
    // Local data never changes behind our back; cloud data may change from another device.
    staleTime: auth.backend?.kind === 'cloud' ? 30_000 : Infinity,
  })
}

export function useStore() {
  const auth = useAuth()
  const qc = useQueryClient()
  const query = useAppState()
  const { backend, session } = auth
  const key = useMemo(() => stateKey({ backend, session }), [backend, session])
  const saving = useIsMutating({ mutationKey: ['save'] }) > 0

  const mutation = useMutation({
    mutationKey: ['save'],
    // One scope: saves run in order, so a fast double-tap can't land out of order.
    scope: { id: 'save' },
    mutationFn: ({ op, next }: { op: Op; next: State }) => auth.backend!.save(op, next),
    onError: (e) => {
      console.error(e)
      toast.error("Couldn't save. Check your connection and try again.")
      void qc.invalidateQueries({ queryKey: key })
    },
  })

  const { mutate } = mutation
  const dispatch = useCallback(
    (op: Op) => {
      const prev = qc.getQueryData<State>(key) ?? emptyState()
      const next = reduce(prev, op)
      void qc.cancelQueries({ queryKey: key })
      qc.setQueryData(key, next)
      mutate({ op, next })
    },
    [qc, key, mutate],
  )

  const sync = query.isPending
    ? 'Loading…'
    : query.isError
      ? "Couldn't load your data"
      : saving
        ? 'Saving…'
        : mutation.isError
          ? "Couldn't save"
          : auth.mode === 'cloud' ? 'Synced' : 'Saved on this device only'

  return { state: query.data ?? emptyState(), ready: query.isSuccess, dispatch, sync, ...auth }
}
