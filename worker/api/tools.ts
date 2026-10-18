import { z } from 'zod'
import type { BuiltEndpoint } from '../lib/http'

/** JSON Schema for what a caller sends (zod's input side, so transforms and defaults don't show). */
export const inputSchema = (s: z.ZodType) => z.toJSONSchema(s, { io: 'input', unrepresentable: 'any' })

/** An endpoint's MCP tool input: its route params and body (or query) as one object. */
export function toolInput<C>(e: BuiltEndpoint<C>) {
  const { params, body, query } = e.schemas
  const shape = { ...params?.shape, ...(body ?? query)?.shape }
  const schema = inputSchema(z.object(shape)) as Record<string, unknown>
  delete schema.$schema
  return schema
}
