import type { ProjectStatus } from '../../core/domain/types'
import type { ProjectStatusRepositoryPort } from '../../core/ports/repositories'
import { SupabaseTable } from './supabase-table'

/** Each project's status: not started, in progress or done. */
export class SupabaseProjectStatusRepository extends SupabaseTable implements ProjectStatusRepositoryPort {
  protected readonly table = 'project_status'

  async all() {
    const out: Record<string, ProjectStatus> = {}
    for (const p of await this.rows(this.own(this.from().select('*')))) out[p.project_id] = p.status
    return out
  }

  async set(projectId: string, status: ProjectStatus) {
    this.check(await this.from().upsert(this.mine({ project_id: projectId, status })))
  }
}
