import type { WorkersAiBinding } from '../adapters/cloudflare/workers-ai.client'

/** The worker's bindings, vars and secrets (wrangler.jsonc, and wrangler secret put / the dashboard). */
export interface Env {
  ASSETS: { fetch(req: Request): Promise<Response> }
  AI: WorkersAiBinding
  VITE_SUPABASE_URL: string
  // Service-role / secret key: bypasses RLS, so every repository is scoped to a user id.
  SUPABASE_SECRET_KEY: string
  TELEGRAM_BOT_TOKEN: string
  // The secret_token passed to setWebhook.
  TELEGRAM_WEBHOOK_SECRET: string
}

export interface ExecutionContext {
  waitUntil(p: Promise<unknown>): void
}
