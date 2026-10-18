/**
 * The MCP server (streamable HTTP, JSON responses): the endpoints marked asTool, called through `invoke` with the
 * same validation and services as REST. One token check per request, from the header or the path (/mcp/<token>).
 */
import { AppError } from '../../src/core/domain/errors'
import { CORS, HttpStatuses, json, type BuiltEndpoint } from '../lib/http'
import type { ApiContext } from './context'
import { bearer } from './guards'
import { toolInput } from './tools'

interface Rpc { jsonrpc: '2.0'; id?: string | number | null; method: string; params?: { name?: string; arguments?: Record<string, unknown>; protocolVersion?: string } }

export class McpServer {
  private readonly tools: BuiltEndpoint<ApiContext>[]

  constructor(endpoints: BuiltEndpoint<ApiContext>[]) {
    this.tools = endpoints.filter((e) => e.tool)
  }

  async handle(req: Request, ctx: ApiContext): Promise<Response> {
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })
    if (req.method !== 'POST') return json({ error: 'Use POST (MCP streamable HTTP).' }, HttpStatuses.MethodNotAllowed)
    const pathToken = new URL(req.url).pathname.split('/')[2] ?? ''
    if (!(await ctx.authenticate(bearer(req) || pathToken)))
      return json({ jsonrpc: '2.0', id: null, error: { code: -32001, message: 'Add a token from Settings → AI access.' } }, HttpStatuses.Unauthorized)
    const body = (await req.json().catch(() => null)) as Rpc | Rpc[] | null
    if (!body) return json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }, HttpStatuses.BadRequest)
    const answers = (await Promise.all((Array.isArray(body) ? body : [body]).map((m) => this.answer(m, ctx)))).filter(Boolean)
    if (!answers.length) return new Response(null, { status: 202, headers: CORS })
    return json(Array.isArray(body) ? answers : answers[0])
  }

  private async answer(m: Rpc, ctx: ApiContext) {
    if (m.id === undefined) return null // a notification: no reply
    const ok = (result: unknown) => ({ jsonrpc: '2.0', id: m.id, result })
    switch (m.method) {
      case 'initialize':
        return ok({
          protocolVersion: m.params?.protocolVersion ?? '2025-06-18',
          capabilities: { tools: {} },
          serverInfo: { name: 'compound', version: '1' },
          instructions: `Compound is a self-development app: learning topics (skills with steps, resources, projects), lists, routines, a notebook and habits. Before building a topic or list, read ${ctx.origin}/llms.txt for what a good one looks like.`,
        })
      case 'ping':
        return ok({})
      case 'tools/list':
        return ok({ tools: this.tools.map((e) => ({ name: e.tool!.name, description: e.tool!.description, inputSchema: toolInput(e) })) })
      case 'tools/call': {
        const tool = this.tools.find((e) => e.tool!.name === m.params?.name)
        if (!tool) return { jsonrpc: '2.0', id: m.id, error: { code: -32602, message: `Unknown tool ${m.params?.name}` } }
        try {
          return ok({ content: [{ type: 'text', text: JSON.stringify(await tool.invoke(m.params?.arguments ?? {}, ctx), null, 2) }] })
        } catch (e) {
          const message = e instanceof AppError ? e.message : e instanceof Error && e.name === 'ZodError' ? `Invalid input: ${e.message}` : 'Something went wrong.'
          if (!(e instanceof AppError) && !(e instanceof Error && e.name === 'ZodError')) console.error('mcp', e)
          return ok({ content: [{ type: 'text', text: message }], isError: true })
        }
      }
      default:
        return { jsonrpc: '2.0', id: m.id, error: { code: -32601, message: `Method not found: ${m.method}` } }
    }
  }
}
