/**
 * Base for the Supabase repositories. Two ways in:
 * - the app's signed-in client: row-level security keeps every query to the user's own rows, and user_id
 *   defaults to auth.uid() in the database;
 * - the worker's service-key client, which bypasses RLS: pass `userId`, and every read filters on it and
 *   every write sets it.
 * Every write stamps `updated_at`. The app replays changes made offline with `at`, the time the change was
 * made on the device: a row is then only written or deleted if the stored one is older, so the latest edit
 * wins. Without `at` (the worker) a write is stamped now.
 */
import type { SupabaseClient } from '@supabase/supabase-js'

// Rows come back untyped (no generated DB types); each repository gives them shape.
// oxlint-disable-next-line no-explicit-any
export type Row = any
// oxlint-disable-next-line no-explicit-any
export type Query = any

export abstract class SupabaseTable {
  protected readonly db: SupabaseClient
  protected readonly userId?: string
  protected readonly at?: string
  protected abstract readonly table: string

  constructor(db: SupabaseClient, userId?: string, at?: string) {
    this.db = db
    this.userId = userId
    this.at = at
  }

  protected from(table = this.table) {
    return this.db.from(table)
  }

  // Scopes a query to the user (worker), or leaves it to RLS (app).
  protected own(q: Query): Query {
    return this.userId ? q.eq('user_id', this.userId) : q
  }

  // Adds user_id to a row being written (worker).
  protected mine<T extends object>(row: T): T {
    return this.userId ? { ...row, user_id: this.userId } : row
  }

  protected check<T extends { error: unknown }>(r: T): T {
    if (r.error) throw r.error
    return r
  }

  protected async rows(p: PromiseLike<{ data: Row; error: unknown }>): Promise<Row[]> {
    return this.check(await p).data ?? []
  }

  protected now() {
    return new Date().toISOString()
  }

  // Saves the row with this key: an update when the stored row is older than `at`, else an insert that does nothing if it exists.
  protected async write(key: Record<string, unknown>, fields: Record<string, unknown>) {
    if (!this.at) return void this.check(await this.from().upsert(this.mine({ ...key, ...fields, updated_at: this.now() })))
    const row = { ...key, ...fields, updated_at: this.at }
    const changed = await this.rows(this.match(this.own(this.from().update(row)), key).lt('updated_at', this.at).select('updated_at'))
    if (!changed.length) this.check(await this.from().upsert(this.mine(row), { ignoreDuplicates: true }))
  }

  // Deletes the row with this key, unless it was changed after `at`.
  protected async drop(key: Record<string, unknown>, table = this.table) {
    const q = this.match(this.own(this.from(table).delete()), key)
    this.check(await (this.at ? q.lte('updated_at', this.at) : q))
  }

  private match(q: Query, key: Record<string, unknown>): Query {
    for (const [k, v] of Object.entries(key)) q = q.eq(k, v)
    return q
  }
}
