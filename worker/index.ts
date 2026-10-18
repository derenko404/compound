/**
 * Cloudflare Worker, the composition root: builds the clients and services and routes requests. Only these paths
 * reach it (run_worker_first in wrangler.jsonc), the rest is the app from dist/:
 * - /api/v1 and /mcp: AI access (./api), with a token from Settings → AI access;
 * - /tg: the Telegram bot's webhook (./telegram);
 * - the crons: daily cleanup, hourly push reminders.
 */
import { createClient } from '@supabase/supabase-js'
import { WorkersAiClient } from '../adapters/cloudflare/workers-ai.client'
import { SupabaseRepositories } from '../adapters/supabase'
import { SupabaseMaintenanceRepository } from '../adapters/supabase/maintenance.repository'
import { SupabasePushSubscriptionRepository } from '../adapters/supabase/push-subscription.repository'
import { SupabaseTelegramLinkRepository } from '../adapters/supabase/telegram-link.repository'
import { TelegramClient } from '../adapters/telegram/telegram.client'
import { FetchPageReader } from '../adapters/web/page-reader'
import { WebPushClient } from '../adapters/web/web-push.client'
import { CleanupService } from '../core/services/cleanup.service'
import { NoteFilerService } from '../core/services/note-filer.service'
import { ReminderService } from '../core/services/reminder.service'
import { StateService } from '../core/services/state.service'
import { TelegramBotService } from '../core/services/telegram-bot.service'
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

function reminders(env: Env) {
  if (!env.VAPID_PRIVATE_KEY) return null
  const db = getDbFrom(env)
  return new ReminderService({
    devices: new SupabasePushSubscriptionRepository(db),
    push: new WebPushClient(env.VAPID_PRIVATE_KEY, env.VAPID_SUBJECT),
    stateFor: (userId) => new StateService(SupabaseRepositories.create(db, userId)).load(),
  })
}

// The daily cron (wrangler.jsonc) cleans up, the hourly one sends reminders.
const DAILY_CRON = '0 3 * * *'

export default {
  async scheduled(event: { cron: string }, env: Env, ctx: ExecutionContext) {
    if (event.cron === DAILY_CRON) ctx.waitUntil(new CleanupService(new SupabaseMaintenanceRepository(getDbFrom(env))).run())
    else ctx.waitUntil(reminders(env)?.run() ?? Promise.resolve())
  },

  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const { pathname, origin } = new URL(req.url)
    if (api.handles(pathname)) return api.handle(req, getDbFrom(env), origin)
    if (pathname === '/tg') return telegramWebhook(env).handle(req, ctx)
    return env.ASSETS.fetch(req)
  },
}
