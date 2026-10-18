import type { SupabaseClient } from '@supabase/supabase-js'
import type { Share, ShareRepositoryPort, SharedContent } from '../../core/ports/shares'

/** Shares: the owner's rows via RLS, and get_share (security definer) for anyone with the id. */
export class SupabaseShareRepository implements ShareRepositoryPort {
  private readonly db: SupabaseClient

  constructor(db: SupabaseClient) {
    this.db = db
  }

  async create(share: Parameters<ShareRepositoryPort['create']>[0]) {
    const { error } = await this.db.from('shares').insert(share)
    if (error) throw error
  }

  async mine(sinceIso: string): Promise<Share[]> {
    const { data, error } = await this.db.from('shares').select('id, kind, name, created_at').gt('created_at', sinceIso).order('created_at', { ascending: false })
    if (error) throw error
    return data ?? []
  }

  async remove(id: string) {
    const { error } = await this.db.from('shares').delete().eq('id', id)
    if (error) throw error
  }

  async get(id: string): Promise<SharedContent | null> {
    const { data, error } = await this.db.rpc('get_share', { share_id: id })
    if (error) throw error
    return (data as SharedContent[] | null)?.[0] ?? null
  }
}
