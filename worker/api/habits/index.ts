import { Endpoint } from '../../lib/http'
import type { ApiContext } from '../context'
import { authenticated } from '../guards'

/** Wellbeing habits, read-only. */
export const listHabitsEndpoint = new Endpoint<ApiContext>()
  .route('/habits', 'GET')
  .asTool('list_habits', 'Wellbeing habits (gym, water, sleep, meditation, reading, quit smoking, new and broken habits).')
  .addGuard(authenticated)
  .handler(async ({ ctx }) => (await ctx.services.habits.all()).map(({ id, type, name, why, start_date, days, custom_data }) => ({ id, type, name, why, start_date, days, custom_data })))
  .build()
