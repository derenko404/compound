import type { ListDef, Topic } from '../domain/types'

export type ShareKind = 'topic' | 'list'
export interface Share { id: string; kind: ShareKind; name: string; created_at: string }
// What a share link shows. `mine` says whether the visitor made it (null when signed out).
export interface SharedContent { kind: ShareKind; name: string; data: Topic | ListDef; created_at: string; mine: boolean | null }

/** Share-by-link snapshots: written by their owner, readable by anyone with the id. */
export interface ShareRepositoryPort {
  create(share: { id: string; kind: ShareKind; name: string; data: Topic | ListDef }): Promise<void>
  // The owner's shares made after `sinceIso`, newest first.
  mine(sinceIso: string): Promise<Share[]>
  remove(id: string): Promise<void>
  get(id: string): Promise<SharedContent | null>
}
