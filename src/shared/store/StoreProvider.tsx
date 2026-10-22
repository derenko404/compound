import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react'
import { useInfiniteQuery, useIsMutating, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAuthRetryableFetchError, type Session } from '@supabase/supabase-js'
import { toast } from 'sonner'
import { emptyState, type Op, type State } from '@core/domain/types'
import { cloudBackend, localBackend, storedSession, supabase, type Backend, type NotesFilter } from '@/shared/api/backends'
import { reduce } from '@core/domain/reduce'
import { normalizeState } from '@core/domain/content'
import { t } from '@/shared/i18n'

export type SyncState = 'loading' | 'loadError' | 'saving' | 'saveError' | 'offline' | 'synced' | 'local'

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
    // Offline with an expired token Supabase returns no session; the one saved on the device still opens the account.
    supabase.auth.getSession().then(({ data, error }) => pick(data.session ?? (isAuthRetryableFetchError(error) ? storedSession() : null)))
    const { data } = supabase.auth.onAuthStateChange((event, sess) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') pick(sess)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const userId = session?.user.id
  const backend = useMemo(
    () => (mode === 'cloud' && supabase && userId ? cloudBackend(supabase, userId) : mode === 'local' ? localBackend : null),
    [mode, userId],
  )
  useSyncRuns(backend)

  const useLocal = useCallback(() => {
    localStorage.setItem(LOCAL_CHOICE, '1')
    setMode('local')
  }, [])

  // Signing out removes the account's copy and its unsent changes from this device (Settings asks first).
  const signOut = useCallback(async () => {
    backend?.forget?.()
    localStorage.removeItem(LOCAL_CHOICE)
    if (supabase) await supabase.auth.signOut()
    qc.removeQueries({ queryKey: ['state'] })
    setMode(supabase ? 'signin' : 'local')
  }, [qc, backend])

  return <AuthCtx.Provider value={{ mode, session, backend, useLocal, signOut }}>{children}</AuthCtx.Provider>
}

export function useAuth() {
  const a = useContext(AuthCtx)
  if (!a) throw new Error('useAuth outside StoreProvider')
  return a
}

const stateKey = (a: Pick<Auth, 'backend' | 'session'>) => ['state', a.backend?.kind ?? 'none', a.session?.user.id ?? 'device'] as const

/**
 * Sends the account's waiting changes: at start, when the connection comes back, on return to the app, after
 * each save, and every 30 seconds while some wait. After a run the state and notes are read again, since the
 * server has the last word (latest edit wins). Changes the server refuses for good are dropped with a toast.
 */
function useSyncRuns(backend: Backend | null) {
  const qc = useQueryClient()
  useEffect(() => {
    const sync = backend?.sync
    if (!sync) return
    const run = () => {
      if (!navigator.onLine || !sync.get().pending) return
      sync.flush().then((dropped) => {
        for (const e of dropped) {
          console.error(e)
          // 23505: unique violation, which for notes means the link is saved already.
          toast.error((e as { code?: string }).code === '23505' ? t.common.linkExists : t.common.saveFailed)
        }
        void qc.invalidateQueries({ queryKey: ['state'] })
        void qc.invalidateQueries({ queryKey: ['notes'] })
      }, (e: unknown) => console.warn('Sync paused', e))
    }
    const visible = () => document.visibilityState === 'visible' && run()
    // A new change starts a run; a run that failed waits for the next trigger, so a down server isn't hammered.
    let waiting = sync.get().pending
    const stop = sync.subscribe(() => {
      const { pending } = sync.get()
      if (pending > waiting) run()
      waiting = pending
    })
    const timer = setInterval(run, 30_000)
    addEventListener('online', run)
    document.addEventListener('visibilitychange', visible)
    run()
    return () => {
      stop()
      clearInterval(timer)
      removeEventListener('online', run)
      document.removeEventListener('visibilitychange', visible)
    }
  }, [backend, qc])
}

const onlineNow = (cb: () => void) => {
  addEventListener('online', cb)
  addEventListener('offline', cb)
  return () => {
    removeEventListener('online', cb)
    removeEventListener('offline', cb)
  }
}

// Whether the device has a connection, kept up to date.
export const useOnline = () => useSyncExternalStore(onlineNow, () => navigator.onLine)

const noSync = { pending: 0, sending: false }
const noSubscribe = () => () => {}

// How many changes wait to reach the server, and whether they're being sent.
export function useSyncStatus() {
  const sync = useAuth().backend?.sync
  return useSyncExternalStore(sync ? (cb) => sync.subscribe(cb) : noSubscribe, () => sync?.get() ?? noSync)
}

export function useAppState() {
  const auth = useAuth()
  return useQuery({
    queryKey: stateKey(auth),
    queryFn: async () => normalizeState(await auth.backend!.load()),
    enabled: !!auth.backend,
    // The account's copy on this device shows at once (and offline); the server is read right after.
    initialData: () => {
      const s = auth.backend?.cached?.()
      return s ? normalizeState(s) : undefined
    },
    initialDataUpdatedAt: 0,
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
    // Saves go to the device first (and queue for the server), so they run offline too.
    networkMode: 'always',
    mutationFn: ({ op, next }: { op: Op; next: State }) => auth.backend!.save(op, next),
    onError: (e) => {
      console.error(e)
      // 23505: unique violation, which for notes means the link is saved already.
      toast.error((e as { code?: string }).code === '23505' ? t.common.linkExists : t.common.saveFailed)
      void qc.invalidateQueries({ queryKey: key })
    },
    // Notes are read in pages by their own queries, so they refresh once a note change is saved.
    onSuccess: (_r, { op }) => {
      const touches = (o: Op): boolean => o.type === 'putNote' || o.type === 'deleteNote' || (o.type === 'batch' && o.ops.some(touches))
      if (touches(op)) void qc.invalidateQueries({ queryKey: ['notes'] })
    },
    // Saving to the device can only fail if it's full: then the change is gone, so don't hide it.
    retry: false,
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

  const online = useOnline()
  const { pending, sending } = useSyncStatus()
  /**
   * Where the data stands, for the top bar's cloud icon (its words are in t.nav.sync). With data on the device a
   * failed load only means the server can't be reached.
   */
  const sync: SyncState = query.isPending ? 'loading'
    : query.isError && !query.data ? 'loadError'
      : mutation.isError ? 'saveError'
        : auth.mode !== 'cloud' ? (saving ? 'saving' : 'local')
          : sending ? 'saving'
            : !online || pending || query.isError ? 'offline' : 'synced'

  return { state: query.data ?? emptyState(), ready: !!query.data, dispatch, sync, pending, ...auth }
}

export const NOTES_PAGE = 10

// Notebook entries for a filter, newest first, 10 at a time; fetchNextPage loads the next 10. `on: false` skips loading.
export function useNotes(f: NotesFilter, on = true) {
  const { backend, session } = useAuth()
  return useInfiniteQuery({
    queryKey: ['notes', backend?.kind ?? 'none', session?.user.id ?? 'device', f],
    enabled: !!backend && on,
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
