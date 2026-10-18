// Housekeeping across all accounts (the daily cron). Each returns how many rows went.
export interface MaintenanceRepositoryPort {
  deleteSharesBefore(iso: string): Promise<number>
  deleteTelegramCodesBefore(iso: string): Promise<number>
}
