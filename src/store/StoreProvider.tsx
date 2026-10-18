import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useInfiniteQuery, useIsMutating, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Session } from '@supabase/supabase-js'
import { toast } from 'sonner'
import { emptyState, type Op, type State } from '@/lib/types'
import { cloudBackend, localBackend, supabase, type Backend, type NotesFilter } from './backends'
import { reduce } from './reduce'
import { normalizeState } from '@/lib/content'

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
    queryFn: async () => normalizeState(await auth.backend!.load()),
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
      // 23505: unique violation, which for notes means the link is saved already.
      toast.error((e as { code?: string }).code === '23505' ? 'This link is already in your notebook.' : "Couldn't save. Check your connection and try again.")
      void qc.invalidateQueries({ queryKey: key })
    },
    // Notes are read in pages by their own queries, so they refresh once a note change is saved.
    onSuccess: (_r, { op }) => {
      const touches = (o: Op): boolean => o.type === 'putNote' || o.type === 'deleteNote' || (o.type === 'batch' && o.ops.some(touches))
      if (touches(op)) void qc.invalidateQueries({ queryKey: ['notes'] })
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

export const NOTES_PAGE = 10

// Notebook entries for a filter, newest first, 10 at a time; fetchNextPage loads the next 10.
export function useNotes(f: NotesFilter) {
  const { backend, session } = useAuth()
  return useInfiniteQuery({
    queryKey: ['notes', backend?.kind ?? 'none', session?.user.id ?? 'device', f],
    enabled: !!backend,
    initialPageParam: 0,
    queryFn: ({ pageParam }) => backend!.notes(f, pageParam, NOTES_PAGE),
    getNextPageParam: (last, all) => (last.length === NOTES_PAGE ? all.length * NOTES_PAGE : undefined),
  })
}

// How many notes match a filter (for tab counts). Refreshes with the note lists.
export function useNoteCount(f: NotesFilter) {
  const { backend, session } = useAuth()
  return useQuery({
    queryKey: ['notes', 'count', backend?.kind ?? 'none', session?.user.id ?? 'device', f],
    enabled: !!backend,
    queryFn: () => backend!.countNotes(f),
  }).data
}
