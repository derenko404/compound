# TODO

## First-run tour and "Add to Home Screen"

Live. Left:
- [ ] Try on a real iPhone (Safari and installed) and Android Chrome.
- [ ] Polish the tour copy once seen on a phone.

## Push reminders

Built (uncommitted). Each device picks a morning hour ("Good morning", 6–11 or off, default 8) and an evening hour (16–22, default 20), repeated every 2 hours until 22:00, the last one a "last call". Only your own tasks and habits count, nothing is sent once they're done. Text is friendly and progress-aware ("3 of 5 done. Nice!"), in the device's language.

- Core: `core/domain/days.ts`, `core/domain/habits.ts` (habit maths with no words, moved from the app), `core/domain/reminders.ts` (schedule, wall clock per time zone, what's left), `ReminderService`, ports in `core/ports/push.ts`.
- Adapters: `WebPushClient` (VAPID + aes128gcm over Web Crypto, checked against `http_ece`), `SupabasePushSubscriptionRepository`.
- Worker: hourly cron `0 * * * *` next to the daily one, told apart by `event.cron`. Skips reminders while `VAPID_PRIVATE_KEY` is unset.
- App: `src/features/reminders` (subscribe, hours, sync of time zone and language on start), Settings → Notifications. Device-only mode keeps the in-app 20:00 reminder. The service worker words the push (`src/shared/i18n/*/push.ts`).

To ship:
- [ ] Run `supabase/migrations/0005_push_subscriptions.sql` in the SQL Editor.
- [ ] `npx wrangler secret put VAPID_PRIVATE_KEY` with the JWK from `node scripts/vapid-keys.mjs <file>`.
- [ ] `VITE_VAPID_PUBLIC_KEY` in `.env` and Cloudflare build variables.
- [ ] Deploy, then turn it on from the installed app on iPhone and check a real push (try `--test-scheduled` with an hour that matches).

## AI access: test with real clients

The API (`/api/v1`), MCP server (`/mcp`) and `/llms.txt` are live and tested with curl. Settings → AI access says it works with Claude Code only for now. Update that line when other clients work.

- [ ] Connect Claude Code / Claude Desktop with a token (header, or the `/mcp/<token>` URL) and build a topic and a list.
- [ ] Try ChatGPT connectors, claude.ai custom connectors and Gemini CLI. If they need OAuth sign-in instead of a pasted token, add OAuth to the worker.
