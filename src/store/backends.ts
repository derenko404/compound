import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { emptyState, type Topic, type ListDef, type Note, type Op, type State } from '@/core/domain/types'
import { normalizeState } from '@/core/domain/content'
import type { NotesFilter, Repositories } from '@/core/ports/repositories'
import { StateService } from '@/core/services/state.service'
import { SupabaseRepositories } from '@/adapters/supabase'
import { LocalRepositories, LocalStore } from '@/adapters/local'

export type { NotesFilter }

// Where the app keeps the user's data: the cloud (Supabase, when signed in) or this device. Both are the same
// storage ports underneath (core/ports), read and written through the state service.
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

export const loadLocalSnapshot = async () => device.read()
export const clearLocalSnapshot = () => device.clear()

// Rows outside the state (shares, tokens, Telegram) are still read here, untyped.
const check = <T extends { error: unknown }>(r: T) => {
  if (r.error) throw r.error
  return r
}
// oxlint-disable-next-line no-explicit-any
type Row = any
const rows = async (p: PromiseLike<{ data: Row; error: unknown }>): Promise<Row> => check(await p).data

/* ---------- Export and import a file ---------- */

// Everything as one JSON file: the loaded state plus every note (notes are paged, so they're fetched here).
export async function exportAll(backend: Backend, s: State) {
  const notes: Note[] = []
  while (true) {
    const page = await backend.notes({}, notes.length, 500)
    notes.push(...page)
    if (page.length < 500) break
  }
  return { app: 'compound', exported_at: new Date().toISOString(), state: { ...s, notes } }
}

// Reads a file made by exportAll; the state is merged over the current one, item by item.
export function parseExport(text: string): State {
  const j = JSON.parse(text)
  // Files from before the rename say 'roadmap-log'.
  const s = j?.app === 'compound' || j?.app === 'roadmap-log' ? j.state : j
  if (!s || typeof s !== 'object' || !('days' in s)) throw new Error('Not a Compound export')
  return normalizeState({ ...emptyState(), ...s })
}

// Writes an imported file into the active backend: the account (one save per item) or this device.
export async function importFile(backend: Backend, current: State, file: State) {
  if (backend.kind === 'cloud') return importLocal(supabase!, file)
  const byId = <T extends { id: string }>(a: T[], b: T[]) => [...a.filter((x) => !b.some((y) => y.id === x.id)), ...b]
  const merged: State = {
    ...current,
    settings: { ...current.settings, ...file.settings },
    days: { ...current.days, ...file.days },
    plan: { ...current.plan, ...file.plan },
    projects: { ...current.projects, ...file.projects },
    listProgress: { ...current.listProgress, ...file.listProgress },
    habitLogs: { ...current.habitLogs, ...file.habitLogs },
    notes: byId(current.notes, file.notes),
    topics: byId(current.topics, file.topics),
    lists: byId(current.lists, file.lists),
    routines: byId(current.routines, file.routines),
    habits: byId(current.habits, file.habits),
  }
  device.write(merged)
}

/* ---------- Telegram: link one chat to the account ---------- */

export interface TelegramLink { chat_id: number; username: string | null }

export async function telegramLink(db: SupabaseClient): Promise<TelegramLink | null> {
  return (await rows(db.from('telegram_links').select('chat_id, username').maybeSingle())) ?? null
}

// A one-time code for t.me/<bot>?start=<code>; the bot checks it and saves the link.
export async function telegramCode(db: SupabaseClient) {
  const bytes = crypto.getRandomValues(new Uint8Array(18))
  const code = btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  check(await db.from('telegram_codes').insert({ code }))
  return code
}

export async function disconnectTelegram(db: SupabaseClient) {
  // RLS keeps this to the signed-in account's row; the filter only satisfies "no delete without a filter".
  check(await db.from('telegram_links').delete().not('chat_id', 'is', null))
}

/* ---------- Share by link ---------- */

export type ShareKind = 'topic' | 'list'
export interface Share { id: string; kind: ShareKind; name: string; created_at: string }
export interface SharedContent { kind: ShareKind; name: string; data: Topic | ListDef; created_at: string; mine: boolean | null }

// Saves a snapshot under a random id and returns the id (the link is /share/<id>).
export async function createShare(db: SupabaseClient, kind: ShareKind, name: string, data: Topic | ListDef) {
  const abc = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const id = [...crypto.getRandomValues(new Uint8Array(12))].map((b) => abc[b % abc.length]).join('')
  check(await db.from('shares').insert({ id, kind, name, data }))
  return id
}

// Links work for 7 days: get_share stops serving them then, and a daily cron in the worker deletes them.
export const SHARE_DAYS = 7

export async function myShares(db: SupabaseClient): Promise<Share[]> {
  const cutoff = new Date(Date.now() - SHARE_DAYS * 86_400_000).toISOString()
  return (await rows(db.from('shares').select('id, kind, name, created_at').gt('created_at', cutoff).order('created_at', { ascending: false }))) ?? []
}

export async function deleteShare(db: SupabaseClient, id: string) {
  check(await db.from('shares').delete().eq('id', id))
}

// Anyone with the link can read it, signed in or not.
export async function getShare(db: SupabaseClient, id: string): Promise<SharedContent | null> {
  const data = await rows(db.rpc('get_share', { share_id: id }))
  return (data as SharedContent[] | null)?.[0] ?? null
}

/* ---------- AI access: personal access tokens ---------- */

export interface ApiToken { id: string; name: string; prefix: string; created_at: string; last_used_at: string | null }

export async function apiTokens(db: SupabaseClient): Promise<ApiToken[]> {
  return (await rows(db.from('api_tokens').select('id, name, prefix, created_at, last_used_at').order('created_at'))) ?? []
}

// Makes a token, stores only its SHA-256 hash, and returns the token itself: it can't be shown again.
export async function createApiToken(db: SupabaseClient, name: string) {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  const token = 'rl_' + btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)))].map((b) => b.toString(16).padStart(2, '0')).join('')
  check(await db.from('api_tokens').insert({ name, token_hash: hash, prefix: token.slice(0, 10) }))
  return token
}

export async function revokeApiToken(db: SupabaseClient, id: string) {
  check(await db.from('api_tokens').delete().eq('id', id))
}

// Copies everything saved on this device into the signed-in account.
export async function importLocal(db: SupabaseClient, s: State) {
  const be = cloudBackend(db)
  const ops: Op[] = [{ type: 'settings', patch: s.settings }]
  for (const [day, log] of Object.entries(s.days)) ops.push({ type: 'day', day, log })
  for (const [taskId, doneAt] of Object.entries(s.plan)) ops.push({ type: 'plan', taskId, doneAt })
  for (const [projectId, status] of Object.entries(s.projects)) ops.push({ type: 'project', projectId, status })
  for (const note of s.notes) ops.push({ type: 'putNote', note })
  for (const [list, items] of Object.entries(s.listProgress))
    for (const [item, progress] of Object.entries(items)) ops.push({ type: 'listItem', list, item, progress })
  for (const topic of s.topics) ops.push({ type: 'putTopic', topic })
  for (const list of s.lists) ops.push({ type: 'putList', list })
  for (const routine of s.routines) ops.push({ type: 'putRoutine', routine })
  for (const habit of s.habits) ops.push({ type: 'putHabit', habit })
  for (const [habit, log] of Object.entries(s.habitLogs))
    for (const [day, value] of Object.entries(log)) ops.push({ type: 'habitLog', habit, day, value })
  for (const op of ops) await be.save(op, s)
}
