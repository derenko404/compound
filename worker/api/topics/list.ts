import { Endpoint } from '../../lib/http'
import type { ApiContext } from '../context'
import { authenticated } from '../guards'
import { present } from './present'

/** All topics with counts. */
export const listTopicsEndpoint = new Endpoint<ApiContext>()
  .route('/topics', 'GET')
  .asTool('list_topics', 'All topics (learning areas) with counts of skills, steps (and how many are done), resources and projects.')
  .addGuard(authenticated)
  .handler(async ({ ctx }) => {
    const topics = ctx.services.topics
    const [all, done] = await Promise.all([topics.all(), topics.ticks()])
    return all.map((t) => present.summary(t, done))
  })
  .build()
