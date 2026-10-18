import type { CollectionRepositoryPort } from '../../core/ports/repositories'
import { SupabaseTable } from './supabase-table'

/** Topics, lists and routines: each row keeps the whole object as JSON in `data`, ordered by its position. */
export class SupabaseJsonCollectionRepository<T extends { id: string; position: number }> extends SupabaseTable implements CollectionRepositoryPort<T> {
  protected readonly table: string

  constructor(table: string, ...base: ConstructorParameters<typeof SupabaseTable>) {
    super(...base)
    this.table = table
  }

  async all(): Promise<T[]> {
    const rows = (await this.rows(this.own(this.from().select('data')))) as { data: T }[]
    return rows.map((r) => r.data).sort((a, b) => a.position - b.position)
  }

  async put(item: T) {
    this.check(await this.from().upsert(this.mine({ id: item.id, data: item, updated_at: this.now() })))
  }

  async remove(id: string) {
    this.check(await this.own(this.from().delete().eq('id', id)))
  }
}
