import type { ListDef, Topic } from '../domain/types'
import type { ShareKind, ShareRepositoryPort } from '../ports/shares'
import { random } from './random'

/**
 * Share by link: a snapshot (content only) under a random id, at /share/<id>. Links work for 7 days: get_share
 * stops serving them then, and the daily cleanup deletes them.
 */
export class ShareService {
  static readonly DAYS = 7
  private readonly shares: ShareRepositoryPort

  constructor(shares: ShareRepositoryPort) {
    this.shares = shares
  }

  // Saves a snapshot and returns its id.
  async create(kind: ShareKind, name: string, data: Topic | ListDef) {
    const id = random.readable(12)
    await this.shares.create({ id, kind, name, data })
    return id
  }

  mine() {
    return this.shares.mine(new Date(Date.now() - ShareService.DAYS * 86_400_000).toISOString())
  }

  remove(id: string) {
    return this.shares.remove(id)
  }

  get(id: string) {
    return this.shares.get(id)
  }
}
