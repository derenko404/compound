import { Endpoint, zodBody, zodParams } from '../../lib/http'
import type { ApiContext } from '../context'
import { authenticated } from '../guards'
import { idParams, topicFields } from '../schemas'
import { present } from './present'

/** Changes a topic. Items sent are added or changed by id, items left out stay. */
export const updateTopicEndpoint = new Endpoint<ApiContext>()
  .route('/topics/:id', 'PATCH')
  .asTool('update_topic', 'Change a topic. Only fields you send change; items you send in a list (skills, resources, projects, goals, steps) are added or changed by id, and items you leave out stay. Nothing can be deleted through the API.')
  .addGuard(authenticated)
  .addParamsValidation(zodParams(idParams))
  .addBodyValidation(zodBody(topicFields))
  .handler(async ({ params, body, ctx }) => {
    const topics = ctx.services.topics
    const t = await topics.update(params.id, body)
    return present.topic(t, await topics.ticks())
  })
  .build()
