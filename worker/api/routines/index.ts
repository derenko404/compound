import { z } from 'zod'
import { Endpoint, HttpStatuses, zodBody } from '../../lib/http'
import type { ApiContext } from '../context'
import { authenticated } from '../guards'
import { text, when } from '../schemas'

/** Routines and one-off tasks on Today. */
export const listRoutinesEndpoint = new Endpoint<ApiContext>()
  .route('/routines', 'GET')
  .asTool('list_routines', 'Routines and one-off tasks shown on Today.')
  .addGuard(authenticated)
  .handler(({ ctx }) => ctx.services.routines.all())
  .build()

/** A new routine on Today. */
export const addRoutineEndpoint = new Endpoint<ApiContext>()
  .route('/routines', 'POST')
  .status(HttpStatuses.Created)
  .asTool('add_routine', 'Add a routine to Today.')
  .addGuard(authenticated)
  .addBodyValidation(zodBody(z.object({
    title: text(200),
    details: text(400).optional(),
    topic: z.string().optional().describe('A topic id; Personal if left out.'),
    when: when.optional(),
    counts_for_streak: z.boolean().optional().describe('Default true.'),
  })))
  .handler(({ body, ctx }) => ctx.services.routines.add(body))
  .build()
