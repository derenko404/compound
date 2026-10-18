/**
 * One HTTP endpoint, declared with a fluent builder:
 *
 *   new Endpoint<ApiContext>()
 *     .route('/topics/:id', 'PATCH')
 *     .asTool('update_topic', 'Change a topic…')
 *     .addGuard(authenticated)
 *     .addParamsValidation(zodParams(idParams))
 *     .addBodyValidation(zodBody(topicFields))
 *     .handler(({ params, body, ctx }) => ctx.services.topics.update(params.id, body))
 *     .build()
 *
 * Guards run first, in order: true goes on, a Response is sent as is, false is a 401. Then the body, params and
 * query are validated (a 400 with zod's issues on failure), then the handler runs. The handler returns data: REST
 * sends it as JSON, and an endpoint marked asTool is also an MCP tool that gets the same data through `invoke`.
 */
import { z } from 'zod'
import { HttpStatuses } from './http-statuses'
import { errorResponse, json } from './responses'
import type { Source, Validator } from './validation'

export type Method = 'GET' | 'POST' | 'PATCH' | 'PUT'
export type Guard<C> = (req: Request, ctx: C) => boolean | Response | Promise<boolean | Response>
export interface HandlerArgs<C, B, P, Q> { body: B; params: P; query: Q; ctx: C }
export type Handler<C, B, P, Q> = (args: HandlerArgs<C, B, P, Q>) => unknown | Promise<unknown>
export interface Tool { name: string; description: string }

// What build() returns: everything the router, the MCP server and the OpenAPI document need.
export interface BuiltEndpoint<C> {
  method: Method
  path: string
  tool?: Tool
  schemas: Partial<Record<Source, z.ZodObject>>
  handle(req: Request, params: Record<string, string>, ctx: C): Promise<Response>
  invoke(args: Record<string, unknown>, ctx: C): Promise<unknown>
}

export class Endpoint<C, B = undefined, P = undefined, Q = undefined> {
  private method: Method = 'GET'
  private path = '/'
  private tool?: Tool
  private ok: number = HttpStatuses.Ok
  private readonly guards: Guard<C>[] = []
  private readonly validators: Partial<Record<Source, z.ZodObject>> = {}
  private fn?: Handler<C, B, P, Q>

  route(path: string, method: Method): this {
    this.path = path
    this.method = method
    return this
  }

  // The status a successful call answers with (201 for creates).
  status(code: number): this {
    this.ok = code
    return this
  }

  asTool(name: string, description: string): this {
    this.tool = { name, description }
    return this
  }

  addGuard(guard: Guard<C>): this {
    this.guards.push(guard)
    return this
  }

  addBodyValidation<S extends z.ZodObject>(v: Validator<S>): Endpoint<C, z.output<S>, P, Q> {
    return this.validate(v)
  }

  addParamsValidation<S extends z.ZodObject>(v: Validator<S>): Endpoint<C, B, z.output<S>, Q> {
    return this.validate(v)
  }

  addQueryValidation<S extends z.ZodObject>(v: Validator<S>): Endpoint<C, B, P, z.output<S>> {
    return this.validate(v)
  }

  handler(fn: Handler<C, B, P, Q>): this {
    this.fn = fn
    return this
  }

  build(): BuiltEndpoint<C> {
    const fn = this.fn
    if (!fn) throw new Error(`${this.method} ${this.path} has no handler`)
    const { guards, validators, ok } = this
    const parse = (source: Source, raw: unknown) => validators[source]?.parse(raw ?? {}) as never
    const run = (raw: Partial<Record<Source, unknown>>, ctx: C) =>
      fn({ body: parse('body', raw.body), params: parse('params', raw.params), query: parse('query', raw.query), ctx })

    return {
      method: this.method,
      path: this.path,
      tool: this.tool,
      schemas: { ...validators },

      async handle(req, params, ctx) {
        try {
          for (const guard of guards) {
            const ok = await guard(req, ctx)
            if (ok instanceof Response) return ok
            if (!ok) return json({ error: 'Unauthorized' }, HttpStatuses.Unauthorized)
          }
          const body = validators.body ? await req.json().catch(() => ({})) : undefined
          const query = Object.fromEntries(new URL(req.url).searchParams)
          return json(await run({ body, params, query }, ctx), ok)
        } catch (err) {
          return errorResponse(err)
        }
      },

      // MCP: the tool's arguments are split by schema, the route params' keys first, the rest to the body or query.
      async invoke(args, ctx) {
        const paramKeys = Object.keys(validators.params?.shape ?? {})
        const params = Object.fromEntries(Object.entries(args).filter(([k]) => paramKeys.includes(k)))
        const rest = Object.fromEntries(Object.entries(args).filter(([k]) => !paramKeys.includes(k)))
        return run({ params, body: rest, query: rest }, ctx)
      },
    }
  }

  // Returns the same builder with its input types narrowed to the new schema.
  private validate<S extends z.ZodObject, T>(v: Validator<S>): T {
    if (this.fn) throw new Error('Add validation before the handler')
    this.validators[v.source] = v.schema
    return this as unknown as T
  }
}
