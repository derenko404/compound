import type { ApiTokenRepositoryPort } from '../ports/api-tokens'
import { random } from './random'

/**
 * Personal access tokens for AI access: who a token belongs to (worker), and listing, making and revoking them
 * (Settings). A used token is marked so Settings can show when it was last used.
 */
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

  list() {
    return this.tokens.list()
  }

  // Makes a token, stores only its hash, and returns the token itself: it can't be shown again.
  async create(name: string) {
    const token = 'rl_' + random.base64url(32)
    await this.tokens.create({ name, hash: await ApiTokenService.hash(token), prefix: token.slice(0, 10) })
    return token
  }

  revoke(id: string) {
    return this.tokens.revoke(id)
  }

  static async hash(token: string) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
  }
}
