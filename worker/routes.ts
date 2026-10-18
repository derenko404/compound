// HTTP for AI access: the REST API at /api/v1 and the MCP server at /mcp, both over the operations in api.ts.
import type { SupabaseClient } from '@supabase/supabase-js'
import { ApiError, ops, userForToken, type Caller, type OpName } from './api'
import { PALETTE, PROJECT_SIZES, RESOURCE_KINDS } from '../src/lib/content'

/* ---------- The tools: names, descriptions and input schemas (MCP), also the REST docs ---------- */

const id = { type: 'string', description: 'The id, as returned by a list call.' }
const topic = { oneOf: [{ type: 'string' }, { type: 'object', properties: { id: { type: 'string' }, text: { type: 'string' } }, required: ['text'] }] }
const skill = {
  type: 'object', required: ['name'],
  properties: {
    id: { type: 'string', description: 'Keep an existing skill\'s id when updating, so its ticks stay.' },
    name: { type: 'string' }, intro: { type: 'string', description: 'What the skill is and why it matters, 1–2 sentences.' },
    topics: { type: 'array', items: topic, description: 'What to learn, in order. Short, concrete topics.' },
  },
}
const resource = {
  type: 'object', required: ['title'],
  properties: {
    id: { type: 'string' }, title: { type: 'string' }, url: { type: 'string' },
    kind: { type: 'string', enum: RESOURCE_KINDS.map((k) => k.id) }, note: { type: 'string', description: 'Why it is worth it, one line.' },
    free: { type: 'boolean' },
  },
}
const project = {
  type: 'object', required: ['name'],
  properties: {
    id: { type: 'string' }, name: { type: 'string' }, goal: { type: 'string' },
    steps: { type: 'array', items: { type: 'string' } }, done: { type: 'string', description: 'How to know it is finished.' },
    trains: { type: 'array', items: { type: 'string' }, description: 'Skill names it practises.' },
    size: { type: 'string', enum: PROJECT_SIZES.map((s) => s.value) },
  },
}
const trackFields = {
  name: { type: 'string', description: 'Short: it shows on tags and buttons. "English", "System design".' },
  description: { type: 'string', description: 'About: what this track is, why it matters, how to approach it.' },
  goals: { type: 'array', items: { type: 'string' }, description: 'Where the learner will be at the end.' },
  months: { type: 'integer', description: 'Optional target duration in months.' },
  color: { type: 'string', enum: [...PALETTE] },
  skills: { type: 'array', items: skill }, resources: { type: 'array', items: resource }, projects: { type: 'array', items: project },
}
const item = { type: 'object', required: ['title'], properties: { id: { type: 'string' }, title: { type: 'string' }, detail: { type: 'string', description: 'The small line under it: author, year, artist, country…' } } }
const listFields = {
  name: { type: 'string', description: 'Short, may start with an emoji: "🎬 Films".' },
  title: { type: 'string', description: '"100 films everyone should watch".' },
  detail_label: { type: 'string', description: 'What the detail line is: "Year", "Author".' },
  items: { type: 'array', items: item },
}

export const TOOLS: { name: OpName; description: string; inputSchema: object }[] = [
  { name: 'list_tracks', description: 'All tracks (learning areas) with counts of skills, topics (and how many are done), resources and projects.', inputSchema: { type: 'object', properties: {} } },
  { name: 'get_track', description: 'One track in full: about, goals, skills with topics (and which are done), resources, projects.', inputSchema: { type: 'object', properties: { id }, required: ['id'] } },
  { name: 'create_track', description: 'Create a learning track. Read /llms.txt for what a good track looks like. Project codes are given automatically.', inputSchema: { type: 'object', properties: trackFields, required: ['name'] } },
  { name: 'update_track', description: 'Change a track. Only fields you send change; a list you send (skills, resources, projects, goals) replaces the old one, so send items back with their ids to keep their ticks.', inputSchema: { type: 'object', properties: { id, ...trackFields }, required: ['id'] } },
  { name: 'delete_track', description: 'Delete a track. Personal can\'t be deleted.', inputSchema: { type: 'object', properties: { id }, required: ['id'] } },
  { name: 'list_lists', description: 'All lists (books to read, films to watch…) with how many items are done.', inputSchema: { type: 'object', properties: {} } },
  { name: 'get_list', description: 'One list with its items, ticks and notes.', inputSchema: { type: 'object', properties: { id }, required: ['id'] } },
  { name: 'create_list', description: 'Create a list, e.g. "50 sci-fi films everyone should see", with its items.', inputSchema: { type: 'object', properties: listFields, required: ['name', 'items'] } },
  { name: 'update_list', description: 'Change a list. Items you send replace the old ones; keep ids to keep ticks and notes.', inputSchema: { type: 'object', properties: { id, ...listFields }, required: ['id'] } },
  { name: 'delete_list', description: 'Delete a list with its ticks and notes.', inputSchema: { type: 'object', properties: { id }, required: ['id'] } },
  { name: 'list_routines', description: 'Routines and one-off tasks shown on Today.', inputSchema: { type: 'object', properties: {} } },
  {
    name: 'add_routine', description: 'Add a routine to Today.',
    inputSchema: {
      type: 'object', required: ['title'],
      properties: {
        title: { type: 'string' }, details: { type: 'string' }, track: { type: 'string', description: 'A track id; Personal if left out.' },
        when: { description: '"daily", { kind: "weekly", days: ["mon","wed"] }, { kind: "monthly", day: 1 (or -1 for the last day) } or { kind: "once", date: "YYYY-MM-DD" }.' },
        counts_for_streak: { type: 'boolean', description: 'Default true.' },
      },
    },
  },
  { name: 'delete_routine', description: 'Delete a routine.', inputSchema: { type: 'object', properties: { id }, required: ['id'] } },
  { name: 'list_notes', description: 'Recent notebook entries (notes, ideas, links), newest first.', inputSchema: { type: 'object', properties: { query: { type: 'string' }, track: { type: 'string' }, limit: { type: 'integer' } } } },
  { name: 'add_note', description: 'Save a note, an idea (tag "idea") or a link to the notebook.', inputSchema: { type: 'object', properties: { text: { type: 'string' }, url: { type: 'string' }, tags: { type: 'array', items: { type: 'string' } }, track: { type: 'string' } } } },
  { name: 'list_habits', description: 'Wellbeing habits (gym, water, quit smoking, new and broken habits).', inputSchema: { type: 'object', properties: {} } },
  { name: 'get_focus', description: 'The focus track: the one Today studies from.', inputSchema: { type: 'object', properties: {} } },
  { name: 'set_focus', description: 'Make a learning track the focus.', inputSchema: { type: 'object', properties: { id }, required: ['id'] } },
]

/* ---------- Shared: auth and calling an operation ---------- */

const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization, content-type, mcp-session-id, mcp-protocol-version', 'access-control-allow-methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS' }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body, null, 2), { status, headers: { 'content-type': 'application/json', ...cors } })

// Authorization: Bearer <token>. Clients that can't send headers may put it in the path: /mcp/<token>.
const bearer = (req: Request) => req.headers.get('authorization')?.match(/^Bearer\s+(\S+)$/i)?.[1] ?? ''

async function run(c: Caller, name: OpName, args: unknown) {
  const op = ops[name] as (c: Caller, a: unknown) => Promise<unknown>
  return op(c, args && typeof args === 'object' ? args : {})
}

/* ---------- REST: /api/v1 ---------- */

const ROUTES: [string, RegExp, OpName][] = [
  ['GET', /^\/tracks$/, 'list_tracks'], ['POST', /^\/tracks$/, 'create_track'],
  ['GET', /^\/tracks\/([^/]+)$/, 'get_track'], ['PATCH', /^\/tracks\/([^/]+)$/, 'update_track'], ['DELETE', /^\/tracks\/([^/]+)$/, 'delete_track'],
  ['GET', /^\/lists$/, 'list_lists'], ['POST', /^\/lists$/, 'create_list'],
  ['GET', /^\/lists\/([^/]+)$/, 'get_list'], ['PATCH', /^\/lists\/([^/]+)$/, 'update_list'], ['DELETE', /^\/lists\/([^/]+)$/, 'delete_list'],
  ['GET', /^\/routines$/, 'list_routines'], ['POST', /^\/routines$/, 'add_routine'], ['DELETE', /^\/routines\/([^/]+)$/, 'delete_routine'],
  ['GET', /^\/notes$/, 'list_notes'], ['POST', /^\/notes$/, 'add_note'],
  ['GET', /^\/habits$/, 'list_habits'],
  ['GET', /^\/focus$/, 'get_focus'], ['PUT', /^\/focus$/, 'set_focus'],
]

export async function handleApi(req: Request, db: SupabaseClient, origin: string) {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
  const url = new URL(req.url)
  const path = url.pathname.replace(/^\/api\/v1/, '') || '/'
  if (path === '/openapi.json') return json(openapi(origin))
  const user = await userForToken(db, bearer(req))
  if (!user) return json({ error: 'Send a token from Settings → AI access as "Authorization: Bearer <token>".' }, 401)
  for (const [method, re, name] of ROUTES) {
    const m = path.match(re)
    if (!m || method !== req.method) continue
    const body = ['POST', 'PATCH', 'PUT'].includes(method) ? await req.json().catch(() => ({})) : Object.fromEntries(url.searchParams)
    try {
      return json(await run({ db, user }, name, m[1] ? { ...body, id: decodeURIComponent(m[1]) } : body), method === 'POST' ? 201 : 200)
    } catch (e) {
      if (e instanceof ApiError) return json({ error: e.message }, e.status)
      console.error('api', e)
      return json({ error: 'Something went wrong.' }, 500)
    }
  }
  return json({ error: 'Not found. See /api/v1/openapi.json.' }, 404)
}

function openapi(origin: string) {
  const paths: Record<string, Record<string, object>> = {}
  for (const [method, re, name] of ROUTES) {
    const p = '/api/v1' + re.source.replace(/^\^|\$$/g, '').replace('\\/([^/]+)', '/{id}').replace(/\\\//g, '/')
    const tool = TOOLS.find((t) => t.name === name)!
    const op: Record<string, unknown> = { operationId: name, summary: tool.description, responses: { 200: { description: 'OK' } } }
    if (p.includes('{id}')) op.parameters = [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }]
    if (['POST', 'PATCH', 'PUT'].includes(method)) op.requestBody = { content: { 'application/json': { schema: tool.inputSchema } } }
    ;(paths[p] ??= {})[method.toLowerCase()] = op
  }
  return {
    openapi: '3.1.0',
    info: { title: 'Roadmap Log API', version: '1', description: `Build tracks and lists in Roadmap Log. Guide: ${origin}/llms.txt` },
    servers: [{ url: origin }],
    components: { securitySchemes: { token: { type: 'http', scheme: 'bearer' } } },
    security: [{ token: [] }],
    paths,
  }
}

/* ---------- MCP: streamable HTTP, JSON responses ---------- */

interface Rpc { jsonrpc: '2.0'; id?: string | number | null; method: string; params?: { name?: string; arguments?: unknown; protocolVersion?: string } }

export async function handleMcp(req: Request, db: SupabaseClient, origin: string) {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Use POST (MCP streamable HTTP).' }, 405)
  const pathToken = new URL(req.url).pathname.split('/')[2] ?? ''
  const user = await userForToken(db, bearer(req) || pathToken)
  if (!user) return json({ jsonrpc: '2.0', id: null, error: { code: -32001, message: 'Add a token from Settings → AI access.' } }, 401)
  const body = await req.json().catch(() => null) as Rpc | Rpc[] | null
  if (!body) return json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }, 400)
  const answers = (await Promise.all((Array.isArray(body) ? body : [body]).map((m) => answer(m, { db, user }, origin)))).filter(Boolean)
  if (!answers.length) return new Response(null, { status: 202, headers: cors })
  return json(Array.isArray(body) ? answers : answers[0])
}

async function answer(m: Rpc, c: Caller, origin: string) {
  if (m.id === undefined) return null // a notification: no reply
  const ok = (result: unknown) => ({ jsonrpc: '2.0', id: m.id, result })
  switch (m.method) {
    case 'initialize':
      return ok({
        protocolVersion: m.params?.protocolVersion ?? '2025-06-18',
        capabilities: { tools: {} },
        serverInfo: { name: 'roadmap-log', version: '1' },
        instructions: `Roadmap Log is a self-development app: learning tracks (skills with topics, resources, projects), lists, routines, a notebook and habits. Before building a track or list, read ${origin}/llms.txt for what a good one looks like.`,
      })
    case 'ping':
      return ok({})
    case 'tools/list':
      return ok({ tools: TOOLS })
    case 'tools/call': {
      const name = m.params?.name as OpName
      if (!TOOLS.some((t) => t.name === name)) return { jsonrpc: '2.0', id: m.id, error: { code: -32602, message: `Unknown tool ${name}` } }
      try {
        return ok({ content: [{ type: 'text', text: JSON.stringify(await run(c, name, m.params?.arguments), null, 2) }] })
      } catch (e) {
        if (!(e instanceof ApiError)) console.error('mcp', e)
        return ok({ content: [{ type: 'text', text: e instanceof ApiError ? e.message : 'Something went wrong.' }], isError: true })
      }
    }
    default:
      return { jsonrpc: '2.0', id: m.id, error: { code: -32601, message: `Method not found: ${m.method}` } }
  }
}
