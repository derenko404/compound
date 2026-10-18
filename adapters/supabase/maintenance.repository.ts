import type { SupabaseClient } from '@supabase/supabase-js'
import type { MaintenanceRepositoryPort } from '../../core/ports/maintenance'

/** Cross-account cleanup for the daily cron (service key). */
export class SupabaseMaintenanceRepository implements MaintenanceRepositoryPort {
  private readonly db: SupabaseClient

  constructor(db: SupabaseClient) {
    this.db = db
  }

  deleteSharesBefore(iso: string) {
    return this.deleteBefore('shares', iso)
  }

  deleteTelegramCodesBefore(iso: string) {
    return this.deleteBefore('telegram_codes', iso)
  }

  private async deleteBefore(table: string, iso: string) {
    const r = await this.db.from(table).delete({ count: 'exact' }).lt('created_at', iso)
    if (r.error) console.error('cleanup', table, r.error)
    return r.count ?? 0
  }
}
