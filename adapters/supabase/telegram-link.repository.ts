import type { SupabaseClient } from '@supabase/supabase-js'
import type { TelegramLinkRepositoryPort } from '../../core/ports/telegram'

/** Chat ↔ account links and connect codes (worker, service key). */
export class SupabaseTelegramLinkRepository implements TelegramLinkRepositoryPort {
  private readonly db: SupabaseClient

  constructor(db: SupabaseClient) {
    this.db = db
  }

  async userForChat(chatId: number) {
    const { data, error } = await this.db.from('telegram_links').select('user_id').eq('chat_id', chatId).maybeSingle()
    if (error) console.error('link', error)
    return (data?.user_id as string | undefined) ?? null
  }

  async code(code: string) {
    const { data } = await this.db.from('telegram_codes').select('user_id, created_at').eq('code', code).maybeSingle()
    return data ? { userId: data.user_id as string, createdAt: data.created_at as string } : null
  }

  async link(userId: string, chatId: number, username: string | null) {
    // A chat belongs to one account: linking it here unlinks it anywhere else.
    await this.db.from('telegram_links').delete().eq('chat_id', chatId)
    const { error } = await this.db.from('telegram_links').upsert({ user_id: userId, chat_id: chatId, username }, { onConflict: 'user_id' })
    await this.db.from('telegram_codes').delete().eq('user_id', userId)
    if (error) throw error
  }
}
