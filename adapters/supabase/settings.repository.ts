import type { Program } from '../../core/domain/types'
import type { SettingsRepositoryPort } from '../../core/ports/repositories'
import { SupabaseTable, type Row } from './supabase-table'

/** One settings row per user. `program` holds the seed version and the focus topic. */
export class SupabaseSettingsRepository extends SupabaseTable implements SettingsRepositoryPort {
  protected readonly table = 'settings'

  async program(): Promise<Program | undefined> {
    const s = this.check(await this.own(this.from().select('*')).maybeSingle()).data as Row
    return s?.program ?? undefined
  }

  async setProgram(program: Program | undefined) {
    await this.write({}, { program: program ?? null })
  }
}
