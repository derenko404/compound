# TODO

## AI access: let any AI build tracks and lists in the app

Goal: someone who wants to learn a topic asks their AI (Claude, ChatGPT, Gemini…) to build it in Roadmap Log. The AI connects with a token the user gives it and creates the track, with tasks, projects, resources, checklists and tips.

Decisions: tokens have **full access** (read, write, delete) to their owner's data. Built after the page rework, on the final data shape.

### 1. Personal access tokens

- [x] Migration: `api_tokens` (id, user_id, name, token_hash, created_at, last_used_at), RLS "own rows". Store only a hash (SHA-256); the token is shown once.
- [x] Settings → **AI access**: create a token (name it, copy once), list tokens with last used, revoke.
- [x] Copyable prompt next to the token: "Use the Roadmap Log API at … with this token to build me a track for <topic>…".

### 2. API in the Worker

- [x] Route `/api/*` and `/mcp` through the Worker (`run_worker_first` in `wrangler.jsonc`).
- [x] Auth: `Authorization: Bearer <token>` → hash → `api_tokens` → user_id; update `last_used_at`. Every query scoped to that user_id (the Worker uses the secret key, which bypasses RLS).
- [x] REST `/api/v1`: tracks (list, get, create with full content, update, delete), routines, notes, lists, habits, settings/program. Validate input against the `types.ts` shapes; assign ids and project codes (`nextProjectCode`) server-side.
- [x] OpenAPI description at `/api/v1/openapi.json`.

### 3. MCP server

- [x] Remote MCP (streamable HTTP) at `/mcp` on the same handlers. Tools: `list_tracks`, `get_track`, `create_track`, `update_track`, `delete_track`, `list_lists`, `create_list`, `update_list`, `add_routine`, `add_note`, `add_find`, …
- [ ] Test with Claude (custom connector), ChatGPT connectors, Gemini CLI. ChatGPT and claude.ai connectors may want OAuth instead of a pasted token.

### 4. Instructions for AIs

- [x] `/llms.txt`: what a track is, the data shape, what a good track looks like (goals → skills with topics in order → resources by type → projects), project codes, limits.
- [x] Link it from the Settings prompt and the OpenAPI description.

## Share a track by link

Goal: send a track to a friend; they open the link, preview it, and add their own copy. Build alongside AI access (both treat a track as portable data).

- [ ] Migration: `shared_tracks` (id = short random slug, user_id, data jsonb, created_at). RLS: anyone (anon included) can select by id; only the owner can insert and delete.
- [ ] Share button on a track page: snapshot the **content only** (name, colour, about, goals, duration, skills with topics, resources, projects). Never ticks, notes or progress. Show the link with Copy and the system share sheet (`navigator.share`).
- [ ] Shares are snapshots: editing the track doesn't change a sent link; sharing again makes a new one. List and delete your shares.
- [ ] Route `/share/$id`: read-only preview (About, skills, resources, projects) with **Add to my tracks**. Not signed in → sign in or device-only first, then continue.
- [ ] Adding makes a copy with fresh ids, project codes from the friend's tracks (`nextProjectCode`) and a unique track id.

## Lists: share by link and generate with AI

Goal: lists work like tracks, as portable content. Send a list to a friend, and let any AI create a list the same way it creates a track ("50 sci-fi films everyone should see"), through AI access above.

- [ ] Share: same flow as tracks (share button, snapshot of the list's name, title, label and items only, never ticks or notes; preview page with **Add to my lists**). Reuse the `shared_tracks` table with a `kind` column, or one `shared` table for both.
- [x] Create with any AI, same as tracks: lists in the API and MCP (`list_lists`, `create_list` with items, `update_list`), and a list example in `/llms.txt`. No AI inside the app.

## Push reminders

Goal: reminders reach the phone even when the app is closed (an installed iPhone app is suspended soon after you leave it, so today's in-app reminder rarely fires there).

Decisions: from the reminder time, every 2 hours until 22:00, only while items are left. Only **your own tasks and habits** trigger a reminder; track suggestions are mentioned in the text but don't count. The message says what's left: "2 left: Gym, Water 3/8. Also 3 suggestions from your tracks."

- [ ] Check which Web Push library runs on Workers (VAPID ES256 + aes128gcm with Web Crypto); else write it (~100 lines).
- [ ] VAPID keys as worker secrets (`npx wrangler secret put VAPID_PRIVATE_KEY`, public key in the app as a build variable).
- [ ] Migration: `push_subscriptions` (user_id, endpoint, p256dh, auth, time zone, reminder time, created_at), RLS "own rows".
- [ ] Settings → reminders: subscribe the device (permission asked from a tap; iOS needs the installed app, 16.4+), save the subscription, unsubscribe. Replaces `startReminderLoop` in `src/fx/notify.ts`.
- [ ] Worker `scheduled()` with an hourly cron in `wrangler.jsonc`: per subscription, at the user's local reminder times, load their data, work out what's left with the pure logic from `derive.ts` / `habits.ts`, send the push; drop subscriptions that return 404/410.
- [ ] `src/sw.ts` already shows `push` and opens the app on `notificationclick`; check it opens Today.

## Page rework (done)

- [x] Today, Tracks, Notebook, Wellbeing, Lists, Settings. One schema: `supabase/migrations/0001_schema.sql`.

## Later

- [ ] Update CLAUDE.md and README once the rework is done.
