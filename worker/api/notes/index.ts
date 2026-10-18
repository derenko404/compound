import { z } from 'zod'
import { Endpoint, HttpStatuses, zodBody, zodQuery } from '../../lib/http'
import type { ApiContext } from '../context'
import { authenticated } from '../guards'
import { text } from '../schemas'

/** Recent notebook entries, newest first. */
export const listNotesEndpoint = new Endpoint<ApiContext>()
  .route('/notes', 'GET')
  .asTool('list_notes', 'Recent notebook entries (notes, ideas, links), newest first.')
  .addGuard(authenticated)
  .addQueryValidation(zodQuery(z.object({
    query: text(200).optional().describe('Words to find, and #tags.'),
    topic: z.string().optional(),
    limit: z.coerce.number().int().positive().max(100).optional().catch(undefined),
  })))
  .handler(({ query, ctx }) => ctx.services.notes.list(query))
  .build()

/** A note, an idea (tag "idea") or a link. The same link again updates its entry. */
export const addNoteEndpoint = new Endpoint<ApiContext>()
  .route('/notes', 'POST')
  .status(HttpStatuses.Created)
  .asTool('add_note', 'Save a note, an idea (tag "idea") or a link to the notebook.')
  .addGuard(authenticated)
  .addBodyValidation(zodBody(z.object({
    text: text(8000).optional(),
    url: text(1000).optional(),
    tags: z.array(z.string()).optional(),
    topic: z.string().optional(),
  })))
  .handler(({ body, ctx }) => ctx.services.notes.add(body, 'api'))
  .build()
