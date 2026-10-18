import type { WorkersAiBinding } from '../adapters/cloudflare/workers-ai.client'

/** The worker's bindings, vars and secrets (wrangler.jsonc, and wrangler secret put / the dashboard). */
export interface Env {
  ASSETS: { fetch(req: Request): Promise<Response> }
  AI: WorkersAiBinding
  VITE_SUPABASE_URL: string
  VITE_SUPABASE_PUBLISHABLE_KEY: string
  // Service-role / secret key: bypasses RLS, so every repository is scoped to a user id.
  SUPABASE_SECRET_KEY: string
  TELEGRAM_BOT_TOKEN: string
  // The secret_token passed to setWebhook.
  TELEGRAM_WEBHOOK_SECRET: string
  // The P-256 private key for Web Push, as a JWK (scripts/vapid-keys.mjs). Unset: no reminders are sent.
  VAPID_PRIVATE_KEY?: string
  // Who sends the pushes, for push services: the app's URL.
  VAPID_SUBJECT: string
}

export interface ExecutionContext {
  waitUntil(p: Promise<unknown>): void
}
