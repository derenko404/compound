// Personal access tokens for AI access. Only a token's SHA-256 hash is stored.
export interface ApiToken { id: string; name: string; prefix: string; created_at: string; last_used_at: string | null }

export interface ApiTokenRepositoryPort {
  // The token's id and owner for a hash, or null (the worker's check).
  byHash(hash: string): Promise<{ id: string; userId: string } | null>
  touch(id: string): Promise<void>
  // The signed-in user's tokens, and making and revoking them (Settings → AI access).
  list(): Promise<ApiToken[]>
  create(token: { name: string; hash: string; prefix: string }): Promise<void>
  revoke(id: string): Promise<void>
}
