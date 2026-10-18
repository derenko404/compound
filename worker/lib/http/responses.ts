import { z } from 'zod'
import { AppError } from '../../../core/domain/errors'
import { HttpStatuses } from './http-statuses'

export const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, content-type, mcp-session-id, mcp-protocol-version',
  'access-control-allow-methods': 'GET, POST, PATCH, PUT, OPTIONS',
}

export const json = (body: unknown, status: number = HttpStatuses.Ok, headers: HeadersInit = {}) =>
  new Response(JSON.stringify(body, null, 2), { status, headers: { 'content-type': 'application/json', ...CORS, ...headers } })

/**
 * Errors always come back as `{ error, issues? }`: a service's AppError keeps its status, bad input is a 400 with
 * zod's issues, anything else is a 500 (logged, without details).
 */
export function errorResponse(err: unknown): Response {
  if (err instanceof AppError) return json({ error: err.message }, err.status)
  if (err instanceof z.ZodError) return json({ error: 'Invalid input', issues: err.issues }, HttpStatuses.BadRequest)
  console.error(err)
  return json({ error: 'Something went wrong.' }, HttpStatuses.InternalServerError)
}
