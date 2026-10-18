import type { SupabaseClient } from '@supabase/supabase-js'
import type { ApiToken, ApiTokenRepositoryPort } from '../../core/ports/api-tokens'

/**
 * API tokens. The worker (service key) looks tokens up by hash across accounts; the app (RLS) lists, makes and
 * revokes the signed-in user's own.
 */
export class SupabaseApiTokenRepository implements ApiTokenRepositoryPort {
  private readonly db: SupabaseClient

  constructor(db: SupabaseClient) {
    this.db = db
  }

  async byHash(hash: string) {
    const { data } = await this.db.from('api_tokens').select('id, user_id').eq('token_hash', hash).maybeSingle()
    return data ? { id: data.id as string, userId: data.user_id as string } : null
  }

  async touch(id: string) {
    await this.db.from('api_tokens').update({ last_used_at: new Date().toISOString() }).eq('id', id)
  }

  async list(): Promise<ApiToken[]> {
    const { data, error } = await this.db.from('api_tokens').select('id, name, prefix, created_at, last_used_at').order('created_at')
    if (error) throw error
    return data ?? []
  }

  async create(t: { name: string; hash: string; prefix: string }) {
    const { error } = await this.db.from('api_tokens').insert({ name: t.name, token_hash: t.hash, prefix: t.prefix })
    if (error) throw error
  }

  async revoke(id: string) {
    const { error } = await this.db.from('api_tokens').delete().eq('id', id)
    if (error) throw error
  }
}
