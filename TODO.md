# TODO

## First-run tour and "Add to Home Screen"

Live. Left:
- [ ] Try on a real iPhone (Safari and installed) and Android Chrome.
- [ ] Polish the tour copy once seen on a phone.

## Push reminders

Goal: reminders reach the phone even when the app is closed (an installed iPhone app is suspended soon after you leave it, so today's in-app reminder rarely fires there).

Decisions: from the reminder time, every 2 hours until 22:00, only while items are left. Only **your own tasks and habits** trigger a reminder; topic suggestions are mentioned in the text but don't count. The message says what's left: "2 left: Gym, Water 3/8. Also 3 suggestions from your topics."

- [ ] Check which Web Push library runs on Workers (VAPID ES256 + aes128gcm with Web Crypto); else write it (~100 lines).
- [ ] VAPID keys as worker secrets (`npx wrangler secret put VAPID_PRIVATE_KEY`, public key in the app as a build variable).
- [ ] Migration: `push_subscriptions` (user_id, endpoint, p256dh, auth, time zone, reminder time, created_at), RLS "own rows".
- [ ] Settings → reminders: subscribe the device (permission asked from a tap; iOS needs the installed app, 16.4+), save the subscription, unsubscribe. Replaces `startReminderLoop` in `src/shared/lib/reminders.ts`.
- [ ] Worker `scheduled()` (already runs the daily cleanup): add an hourly cron in `wrangler.jsonc` and tell the two apart by `event.cron`. Hourly: per subscription, at the user's local reminder times, load their data, work out what's left with the pure logic from `src/features/today/model/derive.ts` / `src/features/habits/model/habits.ts`, send the push; drop subscriptions that return 404/410.
- [ ] `src/app/sw.ts` already shows `push` and opens the app on `notificationclick`; check it opens Today.

## AI access: test with real clients

The API (`/api/v1`), MCP server (`/mcp`) and `/llms.txt` are live and tested with curl. Settings → AI access says it works with Claude Code only for now. Update that line when other clients work.

- [ ] Connect Claude Code / Claude Desktop with a token (header, or the `/mcp/<token>` URL) and build a topic and a list.
- [ ] Try ChatGPT connectors, claude.ai custom connectors and Gemini CLI. If they need OAuth sign-in instead of a pasted token, add OAuth to the worker.
