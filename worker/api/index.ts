/**
 * AI access: every endpoint is declared once (./topics, ./lists…) and served three ways: as REST under /api/v1,
 * as MCP tools at /mcp, and described in /api/v1/openapi.json. Nothing here deletes data.
 */
import type { BuiltEndpoint } from '../lib/http'
import type { ApiContext } from './context'
import { getFocusEndpoint, setFocusEndpoint } from './focus'
import { listHabitsEndpoint } from './habits'
import { createListEndpoint, getListEndpoint, listListsEndpoint, updateListEndpoint } from './lists'
import { addNoteEndpoint, listNotesEndpoint } from './notes'
import { addRoutineEndpoint, listRoutinesEndpoint } from './routines'
import { createTopicEndpoint, getTopicEndpoint, listTopicsEndpoint, updateTopicEndpoint } from './topics'

export const endpoints: BuiltEndpoint<ApiContext>[] = [
  listTopicsEndpoint, getTopicEndpoint, createTopicEndpoint, updateTopicEndpoint,
  listListsEndpoint, getListEndpoint, createListEndpoint, updateListEndpoint,
  listRoutinesEndpoint, addRoutineEndpoint,
  listNotesEndpoint, addNoteEndpoint,
  listHabitsEndpoint,
  getFocusEndpoint, setFocusEndpoint,
]

export { ApiContext } from './context'
export { ApiServer } from './server'
