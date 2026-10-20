import { Endpoint, zodParams } from '../../lib/http'
import type { ApiContext } from '../context'
import { authenticated } from '../guards'
import { idParams } from '../schemas'
import { present } from './present'

/** One topic in full. */
export const getTopicEndpoint = new Endpoint<ApiContext>()
  .route('/topics/:id', 'GET')
  .asTool('get_topic', 'One topic in full: about, goals, skills with steps (and which are done), tasks, resources, projects with their steps.')
  .addGuard(authenticated)
  .addParamsValidation(zodParams(idParams))
  .handler(async ({ params, ctx }) => {
    const topics = ctx.services.topics
    const [t, done] = await Promise.all([topics.get(params.id), topics.ticks()])
    return present.topic(t, done)
  })
  .build()
