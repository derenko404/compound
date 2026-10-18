import type { BuiltEndpoint } from './endpoint'
import { HttpStatuses } from './http-statuses'
import { CORS, json } from './responses'

interface Compiled<C> { endpoint: BuiltEndpoint<C>; pattern: RegExp; keys: string[] }

/** Matches a request to an endpoint by method and path (`/topics/:id`), under a base path like /api/v1. */
export class Router<C> {
  private readonly base: string
  private readonly routes: Compiled<C>[]

  constructor(base: string, endpoints: BuiltEndpoint<C>[]) {
    this.base = base
    this.routes = endpoints.map((endpoint) => {
      const keys: string[] = []
      const pattern = new RegExp(`^${endpoint.path.replace(/:(\w+)/g, (_, k: string) => (keys.push(k), '([^/]+)'))}$`)
      return { endpoint, pattern, keys }
    })
  }

  handles(path: string) {
    return path === this.base || path.startsWith(`${this.base}/`)
  }

  async handle(req: Request, ctx: C): Promise<Response> {
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })
    const path = new URL(req.url).pathname.slice(this.base.length) || '/'
    const matches = this.routes.filter((r) => r.pattern.test(path))
    if (!matches.length) return json({ error: 'Not found' }, HttpStatuses.NotFound)
    const hit = matches.find((r) => r.endpoint.method === req.method)
    if (!hit) return json({ error: 'Method not allowed' }, HttpStatuses.MethodNotAllowed)
    const values = hit.pattern.exec(path)!.slice(1).map(decodeURIComponent)
    return hit.endpoint.handle(req, Object.fromEntries(hit.keys.map((k, i) => [k, values[i]])), ctx)
  }
}
