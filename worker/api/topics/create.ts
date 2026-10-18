import { Endpoint, HttpStatuses, zodBody } from '../../lib/http'
import type { ApiContext } from '../context'
import { authenticated } from '../guards'
import { topicFields } from '../schemas'
import { present } from './present'

/** A new learning topic. Project codes are given automatically. */
export const createTopicEndpoint = new Endpoint<ApiContext>()
  .route('/topics', 'POST')
  .status(HttpStatuses.Created)
  .asTool('create_topic', 'Create a learning topic. Read /llms.txt for what a good topic looks like. Project codes are given automatically.')
  .addGuard(authenticated)
  .addBodyValidation(zodBody(topicFields))
  .handler(async ({ body, ctx }) => present.topic(await ctx.services.topics.create(body), new Set()))
  .build()
