import type { ApiTokenRepositoryPort } from '../ports/api-tokens'

/** Who a personal access token belongs to. A used token is marked so Settings can show when it was last used. */
export class ApiTokenService {
  private readonly tokens: ApiTokenRepositoryPort

  constructor(tokens: ApiTokenRepositoryPort) {
    this.tokens = tokens
  }

  async userFor(token: string): Promise<string | null> {
    if (!token) return null
    const found = await this.tokens.byHash(await ApiTokenService.hash(token))
    if (!found) return null
    await this.tokens.touch(found.id)
    return found.userId
  }

  static async hash(token: string) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
  }
}
