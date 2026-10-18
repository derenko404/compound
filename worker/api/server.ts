import type { SupabaseClient } from '@supabase/supabase-js'
import { Router, json, type BuiltEndpoint } from '../lib/http'
import { ApiContext } from './context'
import { McpServer } from './mcp'
import { openapi } from './openapi'

/** Serves AI access: REST under /api/v1 (plus its OpenAPI document) and MCP under /mcp. */
export class ApiServer {
  private readonly endpoints: BuiltEndpoint<ApiContext>[]
  private readonly rest: Router<ApiContext>
  private readonly mcp: McpServer

  constructor(endpoints: BuiltEndpoint<ApiContext>[]) {
    this.endpoints = endpoints
    this.rest = new Router('/api/v1', endpoints)
    this.mcp = new McpServer(endpoints)
  }

  handles(path: string) {
    return path.startsWith('/api/') || path === '/mcp' || path.startsWith('/mcp/')
  }

  handle(req: Request, db: SupabaseClient, origin: string): Promise<Response> {
    const path = new URL(req.url).pathname
    const ctx = new ApiContext(db, origin)
    if (path === '/api/v1/openapi.json') return Promise.resolve(json(openapi(this.endpoints, origin)))
    if (path.startsWith('/mcp')) return this.mcp.handle(req, ctx)
    return this.rest.handle(req, ctx)
  }
}
