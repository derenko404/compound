import { Endpoint, HttpStatuses, zodBody, zodParams } from '../../lib/http'
import type { ApiContext } from '../context'
import { authenticated } from '../guards'
import { idParams, listFields } from '../schemas'
import { present } from './present'

/** All lists with how many items are done. */
export const listListsEndpoint = new Endpoint<ApiContext>()
  .route('/lists', 'GET')
  .asTool('list_lists', 'All lists (books to read, films to watch…) with how many items are done.')
  .addGuard(authenticated)
  .handler(async ({ ctx }) => (await ctx.services.lists.all()).map(present.summary))
  .build()

/** One list with its items, ticks and reviews. */
export const getListEndpoint = new Endpoint<ApiContext>()
  .route('/lists/:id', 'GET')
  .asTool('get_list', 'One list with its items, ticks and notes.')
  .addGuard(authenticated)
  .addParamsValidation(zodParams(idParams))
  .handler(async ({ params, ctx }) => present.list(await ctx.services.lists.get(params.id)))
  .build()

/** A new list with its items. */
export const createListEndpoint = new Endpoint<ApiContext>()
  .route('/lists', 'POST')
  .status(HttpStatuses.Created)
  .asTool('create_list', 'Create a list, e.g. "50 sci-fi films everyone should see", with its items.')
  .addGuard(authenticated)
  .addBodyValidation(zodBody(listFields.required({ name: true, items: true })))
  .handler(async ({ body, ctx }) => present.list(await ctx.services.lists.create(body)))
  .build()

/** Changes a list. Items sent are added or changed by id, items left out stay. */
export const updateListEndpoint = new Endpoint<ApiContext>()
  .route('/lists/:id', 'PATCH')
  .asTool('update_list', 'Change a list. Items you send are added or changed by id, and items you leave out stay. Nothing can be deleted through the API.')
  .addGuard(authenticated)
  .addParamsValidation(zodParams(idParams))
  .addBodyValidation(zodBody(listFields))
  .handler(async ({ params, body, ctx }) => present.list(await ctx.services.lists.update(params.id, body)))
  .build()
