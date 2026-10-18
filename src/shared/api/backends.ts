import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Topic, ListDef, Note, Op, State } from '@core/domain/types'
import type { NotesFilter, Repositories } from '@core/ports/repositories'
import { ApiTokenService, BackupService, ShareService, StateService, TelegramConnectService } from '@core/services'
import type { ShareKind } from '@core/ports/shares'
import { SupabaseApiTokenRepository } from '@adapters/supabase/api-token.repository'
import { SupabasePushSubscriptionRepository } from '@adapters/supabase/push-subscription.repository'
import { SupabaseShareRepository } from '@adapters/supabase/share.repository'
import { SupabaseTelegramAccountRepository } from '@adapters/supabase/telegram-account.repository'
import { SupabaseRepositories } from '@adapters/supabase'
import { LocalRepositories, LocalStore } from '@adapters/local'

export type { NotesFilter }

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

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null

const device = new LocalStore()
export const localBackend: Backend = backendOver('local', LocalRepositories.create(device))
export const cloudBackend = (db: SupabaseClient): Backend => backendOver('cloud', SupabaseRepositories.create(db))


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
