import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js'
import { emptyState, type Topic, type ListDef, type Note, type Op, type State } from '@core/domain/types'
import { reduce } from '@core/domain/reduce'
import type { NotesFilter, Repositories } from '@core/ports/repositories'
import { ApiTokenService, BackupService, ShareService, StateService, SyncService, TelegramConnectService } from '@core/services'
import type { ShareKind } from '@core/ports/shares'
import { SupabaseApiTokenRepository } from '@adapters/supabase/api-token.repository'
import { SupabasePushSubscriptionRepository } from '@adapters/supabase/push-subscription.repository'
import { SupabaseShareRepository } from '@adapters/supabase/share.repository'
import { SupabaseTelegramAccountRepository } from '@adapters/supabase/telegram-account.repository'
import { SupabaseRepositories } from '@adapters/supabase'
import { LocalOutboxRepository, LocalRepositories, LocalStore } from '@adapters/local'

export type { NotesFilter }

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null

/**
 * Where the app keeps the user's data: the cloud (Supabase, when signed in) or this device. Both are the same
 * storage ports underneath (core/ports), read and written through the state service.
 */
export interface Backend {
  kind: 'local' | 'cloud'
  load(): Promise<State>
  // Called after the reducer has applied op; `next` is the resulting state.
  save(op: Op, next: State): Promise<void>
  // Notes are read a page at a time, newest first, instead of with the rest of the state.
  notes(f: NotesFilter, offset: number, limit: number): Promise<Note[]>
  // How many notes match, without loading them (tab counts).
  countNotes(f: NotesFilter): Promise<number>
  // The account's copy kept on this device, shown at once and offline (cloud only).
  cached?(): State | null
  // Changes waiting to reach the server (cloud only).
  sync?: SyncService
  // Removes this account's copy and waiting changes from the device (cloud only, on sign out).
  forget?(): void
}

const backendOver = (kind: Backend['kind'], r: Repositories): Backend => {
  const state = new StateService(r)
  return {
  kind,
  load: () => state.load(),
  save: (op, next) => state.apply(op, next),
  notes: (f, offset, limit) => r.notes.page(f, offset, limit),
  countNotes: (f) => r.notes.count(f),
  }
}

// How many notes the device keeps of a signed-in account, newest first, for reading the Notebook offline.
const KEPT_NOTES = 500

/**
 * A server error that sending again won't fix: a Postgres error code (a constraint, a permission), except the
 * classes that mean a connection or capacity problem. Network failures and expired sessions carry no such code.
 */
const refused = (e: unknown) => {
  const code = (e as { code?: unknown } | null)?.code
  return typeof code === 'string' && /^[0-9A-Z]{5}$/.test(code) && !/^(08|40|53|57)/.test(code)
}

const isNoteOp = (o: Op) => o.type === 'putNote' || o.type === 'deleteNote'

/**
 * A signed-in account, offline first. Every change is saved to the device's copy and queued at once; the queue
 * goes to Supabase when there's a connection (see SyncService), where the latest edit of an item wins. Loading
 * reads Supabase and refreshes the copy, with the waiting changes applied on top.
 */
export const cloudBackend = (db: SupabaseClient, userId: string): Backend => {
  const copy = new LocalStore(`roadmap-cloud-${userId}`)
  const local = LocalRepositories.create(copy)
  const onDevice = new StateService(local)
  const server = SupabaseRepositories.create(db)
  const outbox = new LocalOutboxRepository(`roadmap-outbox-${userId}`)
  const sync = new SyncService(outbox, async (p) => {
    // Refreshes an expired session first; without one the change waits.
    const { data } = await db.auth.getSession()
    if (!data.session) throw new Error('No session')
    // A settings op carries the whole settings (see SyncService.record), so the state it leads to is its own.
    await new StateService(SupabaseRepositories.create(db, undefined, p.at)).apply(p.op, reduce(emptyState(), p.op))
  }, refused)
  // Server notes go into the copy, keeping the newest.
  const keepNotes = (ns: Note[]) => copy.edit((s) => {
    const byId = new Map(s.notes.map((n) => [n.id, n]))
    for (const n of ns) byId.set(n.id, n)
    s.notes = [...byId.values()].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, KEPT_NOTES)
  })
  // Notes come from the server unless some are waiting to be sent or there's no connection; then from the copy.
  const fromServer = async <T>(read: () => Promise<T>, fallback: () => Promise<T>) => {
    if (!navigator.onLine || sync.waiting(isNoteOp)) return fallback()
    try {
      return await read()
    } catch (e) {
      if (refused(e)) throw e
      return fallback()
    }
  }
  return {
    kind: 'cloud',
    cached: () => (copy.has() ? copy.read() : null),
    async load() {
      const s = sync.replay(await new StateService(server).load())
      await copy.edit((c) => Object.assign(c, s, { notes: c.notes }))
      return s
    },
    async save(op, next) {
      const p = sync.record(op, next)
      await onDevice.apply(p.op, next)
    },
    notes: (f, offset, limit) => fromServer(async () => {
      const ns = await server.notes.page(f, offset, limit)
      await keepNotes(ns)
      return ns
    }, () => local.notes.page(f, offset, limit)),
    countNotes: (f) => fromServer(() => server.notes.count(f), () => local.notes.count(f)),
    sync,
    forget() {
      copy.clear()
      sync.clear()
    },
  }
}

/**
 * The signed-in session saved on this device, read directly. Supabase gives none back when the access token has
 * expired and it can't reach the server to refresh it; offline the app still opens the account from it.
 */
export const storedSession = (): Session | null => {
  if (!url) return null
  try {
    const raw = localStorage.getItem(`sb-${new URL(url).hostname.split('.')[0]}-auth-token`)
    return raw ? (JSON.parse(raw) as Session) : null
  } catch {
    return null
  }
}


const device = new LocalStore()
export const localBackend: Backend = backendOver('local', LocalRepositories.create(device))


/* ---------- Services the pages call (kept as plain functions until the pages move to features) ---------- */

const repoOf = (backend: Backend) => (backend.kind === 'cloud' ? SupabaseRepositories.create(supabase!) : LocalRepositories.create(device))

export const exportAll = (backend: Backend, s: State) => new BackupService(repoOf(backend)).export(s)
export const parseExport = (text: string) => BackupService.parse(text)
export const importFile = (backend: Backend, _current: State, file: State) => new BackupService(repoOf(backend)).import(file)

export type TelegramLink = { chat_id: number; username: string | null }
const telegram = (db: SupabaseClient) => new TelegramConnectService(new SupabaseTelegramAccountRepository(db))
export const telegramLink = (db: SupabaseClient) => telegram(db).linked()
export const telegramCode = (db: SupabaseClient) => telegram(db).newCode()
export const disconnectTelegram = (db: SupabaseClient) => telegram(db).unlink()

export type { Share, ShareKind, SharedContent } from '@core/ports/shares'
export const SHARE_DAYS = ShareService.DAYS
const shares = (db: SupabaseClient) => new ShareService(new SupabaseShareRepository(db))
export const createShare = (db: SupabaseClient, kind: ShareKind, name: string, data: Topic | ListDef) => shares(db).create(kind, name, data)
export const myShares = (db: SupabaseClient) => shares(db).mine()
export const deleteShare = (db: SupabaseClient, id: string) => shares(db).remove(id)
export const getShare = (db: SupabaseClient, id: string) => shares(db).get(id)

export type { ApiToken } from '@core/ports/api-tokens'
const tokens = (db: SupabaseClient) => new ApiTokenService(new SupabaseApiTokenRepository(db))
export const apiTokens = (db: SupabaseClient) => tokens(db).list()
export const createApiToken = (db: SupabaseClient, name: string) => tokens(db).create(name)
export const revokeApiToken = (db: SupabaseClient, id: string) => tokens(db).revoke(id)

export type { PushDevice } from '@core/ports/push'
// This device's push reminders (Settings → Notifications).
export const pushDevices = (db: SupabaseClient) => new SupabasePushSubscriptionRepository(db)
