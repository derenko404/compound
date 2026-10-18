import type { SupabaseClient } from '@supabase/supabase-js'
import { SupabaseRepositories } from '../../adapters/supabase'
import { SupabaseApiTokenRepository } from '../../adapters/supabase/api-token.repository'
import { fail } from '../../core/domain/errors'
import { ApiTokenService, Services } from '../../core/services'

/**
 * What every API and MCP call carries: the service-key client and the site's origin, and once the token is
 * checked, the user and their services (repositories scoped to that user).
 */
export class ApiContext {
  readonly db: SupabaseClient
  readonly origin: string
  user: string | null = null
  private scoped?: Services

  constructor(db: SupabaseClient, origin: string) {
    this.db = db
    this.origin = origin
  }

  // Checks a token and remembers its owner. False when it isn't a valid token.
  async authenticate(token: string) {
    this.user = await new ApiTokenService(new SupabaseApiTokenRepository(this.db)).userFor(token)
    return !!this.user
  }

  get services(): Services {
    if (!this.user) fail(401, 'Not signed in.')
    return (this.scoped ??= new Services(SupabaseRepositories.create(this.db, this.user!)))
  }
}
