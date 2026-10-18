import type { SupabaseClient } from '@supabase/supabase-js'
import type { ApiTokenRepositoryPort } from '../../core/ports/api-tokens'

/** Token lookup for the worker (service key): finds a token's owner by hash and marks it used. */
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
}
