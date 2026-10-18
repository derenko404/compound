import { createClient } from '@supabase/supabase-js'
import { SupabasePushSubscriptionRepository } from '../../adapters/supabase/push-subscription.repository'
import type { PushSenderPort } from '../../core/ports/push'
import type { ReminderPayload } from '../../core/services/reminder.service'

/**
 * POST /push/hello { endpoint }: right after a device turns reminders on, one push to confirm they arrive.
 * Signed in with the user's Supabase session, so row-level security only finds their own device.
 */
export async function pushHello(req: Request, deps: { url: string; key: string; push: PushSenderPort | null }) {
  const auth = req.headers.get('authorization')
  if (req.method !== 'POST' || !auth) return new Response(null, { status: 401 })
  if (!deps.push) return new Response(null, { status: 503 })
  const { endpoint } = (await req.json().catch(() => ({}))) as { endpoint?: string }
  const db = createClient(deps.url, deps.key, { auth: { persistSession: false }, global: { headers: { Authorization: auth } } })
  const device = endpoint ? await new SupabasePushSubscriptionRepository(db).get(endpoint).catch(() => null) : null
  if (!device) return new Response(null, { status: 404 })
  const payload: ReminderPayload = { kind: 'hello', lang: device.lang, items: [], done: 0, total: 0 }
  const result = await deps.push.send(device, JSON.stringify(payload))
  return new Response(null, { status: result === 'sent' ? 204 : 502 })
}
