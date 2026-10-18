/**
 * Validators for an endpoint's input, each reading one source: the JSON body, the route params (/topics/:id) or
 * the query string. They're zod objects so the same schema also describes the input (MCP tools, OpenAPI).
 */
import type { z } from 'zod'

export type Source = 'body' | 'params' | 'query'

export interface Validator<S extends z.ZodObject = z.ZodObject> {
  source: Source
  schema: S
}

export const zodBody = <S extends z.ZodObject>(schema: S): Validator<S> => ({ source: 'body', schema })
export const zodParams = <S extends z.ZodObject>(schema: S): Validator<S> => ({ source: 'params', schema })
export const zodQuery = <S extends z.ZodObject>(schema: S): Validator<S> => ({ source: 'query', schema })
