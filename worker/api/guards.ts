import { HttpStatuses, json, type Guard } from '../lib/http'
import type { ApiContext } from './context'

// Authorization: Bearer <token>. Clients that can't send headers may put it in the path: /mcp/<token>.
export const bearer = (req: Request) => req.headers.get('authorization')?.match(/^Bearer\s+(\S+)$/i)?.[1] ?? ''

/** Needs a personal access token from Settings → AI access. */
export const authenticated: Guard<ApiContext> = async (req, ctx) =>
  (await ctx.authenticate(bearer(req))) || json({ error: 'Send a token from Settings → AI access as "Authorization: Bearer <token>".' }, HttpStatuses.Unauthorized)
