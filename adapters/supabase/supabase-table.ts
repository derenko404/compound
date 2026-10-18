/**
 * Base for the Supabase repositories. Two ways in:
 * - the app's signed-in client: row-level security keeps every query to the user's own rows, and user_id
 *   defaults to auth.uid() in the database;
 * - the worker's service-key client, which bypasses RLS: pass `userId`, and every read filters on it and
 *   every write sets it.
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
  protected abstract readonly table: string

  constructor(db: SupabaseClient, userId?: string) {
    this.db = db
    this.userId = userId
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
}
