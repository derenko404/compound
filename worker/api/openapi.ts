import type { BuiltEndpoint } from '../lib/http'
import { inputSchema } from './tools'

/** The OpenAPI document for the REST API, generated from the endpoints and their zod schemas. */
export function openapi<C>(endpoints: BuiltEndpoint<C>[], origin: string) {
  const paths: Record<string, Record<string, object>> = {}
  for (const e of endpoints) {
    const path = '/api/v1' + e.path.replace(/:(\w+)/g, '{$1}')
    const params = Object.keys(e.schemas.params?.shape ?? {}).map((name) => ({ name, in: 'path', required: true, schema: { type: 'string' } }))
    const queryProps = e.schemas.query ? (inputSchema(e.schemas.query) as { properties?: Record<string, object> }).properties ?? {} : {}
    const query = Object.entries(queryProps)
      .map(([name, schema]) => ({ name, in: 'query', required: false, schema }))
    const op: Record<string, unknown> = {
      operationId: e.tool?.name, summary: e.tool?.description, responses: { 200: { description: 'OK' } },
    }
    if (params.length || query.length) op.parameters = [...params, ...query]
    if (e.schemas.body) op.requestBody = { content: { 'application/json': { schema: inputSchema(e.schemas.body) } } }
    ;(paths[path] ??= {})[e.method.toLowerCase()] = op
  }
  return {
    openapi: '3.1.0',
    info: { title: 'Compound API', version: '1', description: `Build topics and lists in Compound. Guide: ${origin}/llms.txt` },
    servers: [{ url: origin }],
    components: { securitySchemes: { token: { type: 'http', scheme: 'bearer' } } },
    security: [{ token: [] }],
    paths,
  }
}
