import { Endpoint, zodBody } from '../../lib/http'
import type { ApiContext } from '../context'
import { authenticated } from '../guards'
import { idParams } from '../schemas'

/** The focus topic: the one Today studies from. */
export const getFocusEndpoint = new Endpoint<ApiContext>()
  .route('/focus', 'GET')
  .asTool('get_focus', 'The focus topic: the one Today studies from.')
  .addGuard(authenticated)
  .handler(async ({ ctx }) => ({ focus: await ctx.services.focus.get() }))
  .build()

/** Makes a learning topic the focus. */
export const setFocusEndpoint = new Endpoint<ApiContext>()
  .route('/focus', 'PUT')
  .asTool('set_focus', 'Make a learning topic the focus.')
  .addGuard(authenticated)
  .addBodyValidation(zodBody(idParams))
  .handler(async ({ body, ctx }) => ({ focus: await ctx.services.focus.set(body.id) }))
  .build()
