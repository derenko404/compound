import type { SupabaseClient } from '@supabase/supabase-js'
import type { PushDevice, PushSubscriptionRepositoryPort } from '../../core/ports/push'

const COLUMNS = 'endpoint, p256dh, auth, time_zone, lang, morning_hour, evening_hour'

/** Push subscriptions, one row per device. The app (RLS) manages its own device; the worker (service key) reads them all. */
export class SupabasePushSubscriptionRepository implements PushSubscriptionRepositoryPort {
  private readonly db: SupabaseClient

  constructor(db: SupabaseClient) {
    this.db = db
  }

  async get(endpoint: string) {
    const { data, error } = await this.db.from('push_subscriptions').select(COLUMNS).eq('endpoint', endpoint).maybeSingle()
    if (error) throw error
    return (data as PushDevice | null) ?? null
  }

  // Columns left out keep their saved value (or the table's default on a new row).
  async save(device: Parameters<PushSubscriptionRepositoryPort['save']>[0]) {
    const { error } = await this.db.from('push_subscriptions').upsert(device, { onConflict: 'endpoint' })
    if (error) throw error
  }

  async setHours(endpoint: string, hours: Parameters<PushSubscriptionRepositoryPort['setHours']>[1]) {
    const { error } = await this.db.from('push_subscriptions').update(hours).eq('endpoint', endpoint)
    if (error) throw error
  }

  async remove(endpoint: string) {
    const { error } = await this.db.from('push_subscriptions').delete().eq('endpoint', endpoint)
    if (error) throw error
  }

  async all() {
    const { data, error } = await this.db.from('push_subscriptions').select(`user_id, ${COLUMNS}`)
    if (error) throw error
    return (data ?? []) as (PushDevice & { user_id: string })[]
  }
}
