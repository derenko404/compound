/**
 * Cloudflare Worker, the composition root: builds the clients and services and routes requests. Only these paths
 * reach it (run_worker_first in wrangler.jsonc), the rest is the app from dist/:
 * - /api/v1 and /mcp: AI access (./api), with a token from Settings → AI access;
 * - /tg: the Telegram bot's webhook (./telegram);
 * - the daily cron: cleanup.
 */
import { createClient } from '@supabase/supabase-js'
import { WorkersAiClient } from '../src/adapters/cloudflare/workers-ai.client'
import { SupabaseRepositories } from '../src/adapters/supabase'
import { SupabaseMaintenanceRepository } from '../src/adapters/supabase/maintenance.repository'
import { SupabaseTelegramLinkRepository } from '../src/adapters/supabase/telegram-link.repository'
import { TelegramClient } from '../src/adapters/telegram/telegram.client'
import { FetchPageReader } from '../src/adapters/web/page-reader'
import { CleanupService } from '../src/core/services/cleanup.service'
import { NoteFilerService } from '../src/core/services/note-filer.service'
import { TelegramBotService } from '../src/core/services/telegram-bot.service'
import { ApiServer, endpoints } from './api'
import type { Env, ExecutionContext } from './env'
import { TelegramWebhook } from './telegram/webhook'

const api = new ApiServer(endpoints)

const getDbFrom = (env: Env) => createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } })

function telegramWebhook(env: Env) {
  const db = getDbFrom(env)
  const messenger = new TelegramClient(env.TELEGRAM_BOT_TOKEN)
  const bot = new TelegramBotService({
    links: new SupabaseTelegramLinkRepository(db),
    pages: new FetchPageReader(),
    filer: new NoteFilerService(new WorkersAiClient(env.AI)),
    reposFor: (userId) => SupabaseRepositories.create(db, userId),
  })
  return new TelegramWebhook({ secret: env.TELEGRAM_WEBHOOK_SECRET, bot, messenger })
}

export default {
  async scheduled(_event: unknown, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(new CleanupService(new SupabaseMaintenanceRepository(getDbFrom(env))).run())
  },

  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const { pathname, origin } = new URL(req.url)
    if (api.handles(pathname)) return api.handle(req, getDbFrom(env), origin)
    if (pathname === '/tg') return telegramWebhook(env).handle(req, ctx)
    return env.ASSETS.fetch(req)
  },
}
