// Personal access tokens for AI access. Only a token's SHA-256 hash is stored.
export interface ApiTokenRepositoryPort {
  // The token's id and owner for a hash, or null.
  byHash(hash: string): Promise<{ id: string; userId: string } | null>
  touch(id: string): Promise<void>
}
