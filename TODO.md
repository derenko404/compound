# TODO

## AI access: let any AI build tracks and lists in the app

Goal: someone who wants to learn a topic asks their AI (Claude, ChatGPT, Gemini…) to build it in Roadmap Log. The AI connects with a token the user gives it and creates the track, with tasks, projects, resources, checklists and tips.

Decisions: tokens have **full access** (read, write, delete) to their owner's data. Built after the page rework, on the final data shape.

### 1. Personal access tokens

- [ ] Migration: `api_tokens` (id, user_id, name, token_hash, created_at, last_used_at), RLS "own rows". Store only a hash (SHA-256); the token is shown once.
- [ ] Settings → **AI access**: create a token (name it, copy once), list tokens with last used, revoke.
- [ ] Copyable prompt next to the token: "Use the Roadmap Log API at … with this token to build me a track for <topic>…".

### 2. API in the Worker

- [ ] Route `/api/*` and `/mcp` through the Worker (`run_worker_first` in `wrangler.jsonc`).
- [ ] Auth: `Authorization: Bearer <token>` → hash → `api_tokens` → user_id; update `last_used_at`. Every query scoped to that user_id (the Worker uses the secret key, which bypasses RLS).
- [ ] REST `/api/v1`: tracks (list, get, create with full content, update, delete), routines, notes, finds, lists, settings/program. Validate input against the `types.ts` shapes; assign ids and project codes (`nextProjectCode`) server-side.
- [ ] OpenAPI description at `/api/v1/openapi.json`.

### 3. MCP server

- [ ] Remote MCP (streamable HTTP) at `/mcp` on the same handlers. Tools: `list_tracks`, `get_track`, `create_track`, `update_track`, `delete_track`, `list_lists`, `create_list`, `update_list`, `add_routine`, `add_note`, `add_find`, …
- [ ] Test with Claude (custom connector), ChatGPT connectors, Gemini CLI.

### 4. Instructions for AIs

- [ ] `/llms.txt`: what a track is, the data shape, what a good track looks like (outcomes → month-by-month tasks → projects → resources by type → tips with "Topic: …" and "a → b → c" chains), project codes, limits.
- [ ] Link it from the Settings prompt and the OpenAPI description.

## Share a track by link

Goal: send a track to a friend; they open the link, preview it, and add their own copy. Build alongside AI access (both treat a track as portable data).

- [ ] Migration: `shared_tracks` (id = short random slug, user_id, data jsonb, created_at). RLS: anyone (anon included) can select by id; only the owner can insert and delete.
- [ ] Share button on a track page: snapshot the **guide content only** (name, colour, about, outcomes, skills, plan tasks, projects, learning paths, resources). Never ticks, notes, finds or progress. Show the link with Copy and the system share sheet (`navigator.share`).
- [ ] Shares are snapshots: editing the track doesn't change a sent link; sharing again makes a new one. List and delete your shares.
- [ ] Route `/share/$id`: read-only preview (About, plan by quarter, projects, learning paths, resources) with **Add to my tracks**. Not signed in → sign in or device-only first, then continue.
- [ ] Adding makes a copy with fresh ids, project codes from the friend's tracks (`nextProjectCode`), a unique track id, and plan months clamped to their program length.

## Lists: share by link and generate with AI

Goal: lists work like tracks, as portable content. Send a list to a friend, and build a new list by asking an AI ("50 sci-fi films everyone should see").

- [ ] Share: same flow as tracks (share button, snapshot of the list's name, title, label and items only, never ticks or notes; preview page with **Add to my lists**). Reuse the `shared_tracks` table with a `kind` column, or one `shared` table for both.
- [ ] Generate with any AI: lists in the API and MCP above (`create_list` with items), and a list example in `/llms.txt`.
- [ ] Generate in the app: "New list → Ask AI" with a short prompt (topic, how many). One Workers AI call with a JSON schema (`items: { title, sub }[]`), then the usual list form to review and edit before saving. Check the neuron cost first: a 100-item answer is much longer than a tagging call (about 8 neurons), and the free tier is 10,000 a day.

## Push reminders

Goal: reminders reach the phone even when the app is closed (an installed iPhone app is suspended soon after you leave it, so today's in-app reminder rarely fires there).

Decisions: from the reminder time, every 2 hours until 22:00, only while items are left. Only **your own tasks and habits** trigger a reminder; track suggestions are mentioned in the text but don't count. The message says what's left: "2 left: Gym, Water 3/8. Also 3 suggestions from your tracks."

- [ ] Check which Web Push library runs on Workers (VAPID ES256 + aes128gcm with Web Crypto); else write it (~100 lines).
- [ ] VAPID keys as worker secrets (`npx wrangler secret put VAPID_PRIVATE_KEY`, public key in the app as a build variable).
- [ ] Migration: `push_subscriptions` (user_id, endpoint, p256dh, auth, time zone, reminder time, created_at), RLS "own rows".
- [ ] Settings → reminders: subscribe the device (permission asked from a tap; iOS needs the installed app, 16.4+), save the subscription, unsubscribe. Replaces `startReminderLoop` in `src/fx/notify.ts`.
- [ ] Worker `scheduled()` with an hourly cron in `wrangler.jsonc`: per subscription, at the user's local reminder times, load their data, work out what's left with the pure logic from `derive.ts` / `habits.ts`, send the push; drop subscriptions that return 404/410.
- [ ] `src/sw.ts` already shows `push` and opens the app on `notificationclick`; check it opens Today.

## Page rework (in progress)

- [x] Today
- [x] Tracks (index, track page with tabs)
- [x] Wellbeing (mood, habit trackers as skins over one data shape; migration 0006)
- [x] Plan (removed: tracks have durations, focus is per calendar quarter, set in each track's details)
- [x] Notebook (notes, ideas and finds merged into one feed; migration 0005)
- [ ] Lists
- [ ] Settings

## Later

- [ ] Desktop top bar: logo and tabs in one row with a Settings gear; back link above the page title; page actions (Edit, Done) as buttons on the title row instead of the ⋯ menu. Phones keep the ⋯.
- [ ] Refill the account from `backup/roadmap-backup-2026-10-18.json` when asked.
- [ ] Update CLAUDE.md and README once the rework is done.

# Modal

- Remove delete button from edit modals and replace with separate delete buttons + confirmation
