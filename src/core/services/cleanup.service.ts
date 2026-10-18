import type { MaintenanceRepositoryPort } from '../ports/maintenance'

const DAY_MS = 86_400_000

/**
 * The daily cleanup: shared links older than 7 days (get_share already hides them) and Telegram connect codes
 * nobody used within a day (Settings makes one each time it shows Connect).
 */
export class CleanupService {
  private readonly maintenance: MaintenanceRepositoryPort

  constructor(maintenance: MaintenanceRepositoryPort) {
    this.maintenance = maintenance
  }

  async run(now = Date.now()) {
    const ago = (days: number) => new Date(now - days * DAY_MS).toISOString()
    const [shares, codes] = await Promise.all([
      this.maintenance.deleteSharesBefore(ago(7)),
      this.maintenance.deleteTelegramCodesBefore(ago(1)),
    ])
    console.log(`cleanup: ${shares} shares, ${codes} telegram codes`)
    return { shares, codes }
  }
}
