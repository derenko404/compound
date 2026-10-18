import type { SupabaseClient } from '@supabase/supabase-js'
import type { TelegramAccountRepositoryPort } from '../../core/ports/telegram'

/** The signed-in account's Telegram link and connect codes (RLS keeps each query to its own rows). */
export class SupabaseTelegramAccountRepository implements TelegramAccountRepositoryPort {
  private readonly db: SupabaseClient

  constructor(db: SupabaseClient) {
    this.db = db
  }

  async linked() {
    const { data, error } = await this.db.from('telegram_links').select('chat_id, username').maybeSingle()
    if (error) throw error
    return data ?? null
  }

  async addCode(code: string) {
    const { error } = await this.db.from('telegram_codes').insert({ code })
    if (error) throw error
  }

  async unlink() {
    // RLS keeps this to the signed-in account's row; the filter only satisfies "no delete without a filter".
    const { error } = await this.db.from('telegram_links').delete().not('chat_id', 'is', null)
    if (error) throw error
  }
}
