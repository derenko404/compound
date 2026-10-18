# Roadmap Log

Personal PWA for an 18-month self-development roadmap: daily tasks, quarterly plan, chapter guides (resources, projects, checklists), ideas, finds (saved links), notes, 100-item lists, health trackers. A Telegram bot feeds finds and notes. Live at https://roadmap.vasya-derenko.workers.dev.

## Commands

- `npm run dev` / `npm run build` (runs `tsc -b` first) / `npm run lint` (oxlint) / `npm run preview`
- No test suite. To verify UI, build, run `vite preview`, and drive headless Chrome over CDP (`--remote-debugging-port`, Node's global `WebSocket`). Puppeteer/Playwright are not installed.
  - Use a fresh `--user-data-dir` each run, or an old service worker shows the "Updating the app" overlay.
  - Skip sign-in and seed data: on any page set `localStorage['roadmap-local-only'] = '1'` and `localStorage['roadmap-log-v2'] = JSON.stringify({ bookmarks: [...] })` (merged over `emptyState()`), then navigate.

## Stack

Vite 8 + React 19 + TypeScript 6, TanStack Router (code-based routes in `src/router.tsx`) and TanStack Query, shadcn/ui (new-york) on Tailwind v4, Supabase (Postgres + auth), vite-plugin-pwa (`injectManifest`, worker in `src/sw.ts`). Import alias `@/` → `src/`.

## Data flow

Everything the user changes is an `Op` (`src/lib/types.ts`):

1. `useStore().dispatch(op)` (`src/store/StoreProvider.tsx`) applies `reduce` (`src/store/reduce.ts`) to the cached Query state optimistically.
2. A mutation with `scope: { id: 'save' }` persists it via the active `Backend` (`src/store/backends.ts`), one at a time and in order.
3. Backends: `cloudBackend` (Supabase, one table per kind) when signed in; `localBackend` (one JSON blob in localStorage, key `roadmap-log-v2`) when the user picked device-only.

To add a new kind of data: add the `Op` variant and `State` field in `types.ts`, handle it in `reduce.ts`, in `cloudBackend.load`/`save` and `importLocal`, and add a migration in `supabase/migrations/` with RLS (see below).

Deploy order: the user runs a migration before you push code that reads or writes the new table or column. `cloudBackend.load` uses `select('*')` per table, and a missing table fails the whole load; a missing column fails saves (app and bot). Check a column exists with `curl "$VITE_SUPABASE_URL/rest/v1/<table>?select=<col>&limit=0" -H "apikey: $KEY"` (publishable key from `.env`; `[]` = exists).

`state.plan` (table `plan_progress`) also stores checklist and resource ticks under prefixed ids: `chk:<chapter>:<slug>:<i>` and `res:<chapter>:<slug>`. Count real plan tasks by filtering on `TASKS` ids, not `Object.keys(state.plan)`.

## Content

- `src/data/plan.ts`: chapters, quarters, plan tasks, projects, daily routine, health milestones. Task/project ids are stored in the DB, so don't rename them.
- `src/data/guides.ts`: the roadmap doc transcribed (chapter guides, `PROJECT_DETAILS`, `OVERVIEW`). Source doc: https://claude.ai/code/artifact/61482468-7024-4621-a941-2a770a3df94d (a Claude Docs doc; read it with the Claude Docs connector, not WebFetch).
- `src/data/lists.ts`: generated 100-item lists. List items are keyed by index, so append, don't reorder.
- `DAILY` items feed `CORE_IDS`, which drives the streak; a new core item breaks every past streak. Prefer extending an existing item's `sub`. The `plan-creator` skill (`.claude/skills/plan-creator/`) covers adding content.
- `Linkify` (`src/components/guide.tsx`) auto-links project codes (`T1`…`F4`) to `/chapters/<ch>#<code>`, "Chapter N" to that chapter, and any resource title from `guides.ts` to its URL. Keep codes verbatim in content so links work.

## UI

- Palette and all custom styles live in `src/index.css`. shadcn tokens (`--background`, `--primary`, …) are mapped to the app palette; chapter colours are `--c-<chapter>` and rows read them through `--c` (use `cvar(ch)` from `src/components/kit.tsx`).
- `src/components/ui/*` is shadcn-generated. When adding components with `npx shadcn@latest add …`, the CLI writes `import { cn } from "cn"`: change it to `@/lib/utils`. Sonner must not use `next-themes` (not installed).
- Feedback is part of the product: `Check` plays a sound and particle burst, `celebrate()` throws confetti and plays a fanfare (`src/fx/`). Keep these on new tick-style interactions. Respect `prefers-reduced-motion`.

## Supabase

- Migrations are applied by hand in the Supabase SQL Editor (no CLI). Every table has `user_id default auth.uid()` and an "own rows" RLS policy. The editor warns "without RLS" because policies are created in a `do $$` loop; "Run and enable RLS" is fine.
- Auth: Google OAuth and email + password. Magic links were dropped: the built-in mailer allows about 2 emails an hour (`over_email_send_rate_limit`) and on iOS links open outside the installed PWA.
- OAuth `redirectTo` is `/today`, not `/`, because the `/` route redirects and would drop the `?code=`.

## Env and deploy

- `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`: local `.env` (gitignored; see `.env.example`); in Cloudflare they're build variables (Settings → Build), because Vite inlines them at build time. Worker runtime `vars` do not reach the app.
- Push to `main` → Cloudflare Workers Builds runs `npm run build` and `npx wrangler deploy`. `wrangler.jsonc` serves `dist/` with SPA fallback. Node 22 (`.node-version`).
- Without the env vars the app still builds and runs in device-only mode.

## PWA updates

`src/sw.ts` calls `skipWaiting()` + `clientsClaim()`, and `registerSW` (autoUpdate) reloads the page when a new worker activates. `main.tsx` also calls `reg.update()` on every return to the foreground and hourly, because iOS resumes installed PWAs without reloading. Don't remove these, or phones stay on old versions.

## Finds and the Telegram bot

- Finds = table `bookmarks` (`Bookmark` in `types.ts`, view `src/views/Finds.tsx`, tab `/finds`): `url` unique per user, `kind` video/post/site, `title`, `description`, `tags`, `note`, `chapter` (nullable), `source` app/telegram. Grouped by day, filtered by type/chapter/tag, rendered 20 at a time (all rows load with the state; only the list is windowed). Chapter pages list their finds.
- `worker/index.ts` is a Cloudflare Worker in the same deploy. `wrangler.jsonc` sets `run_worker_first: ["/tg"]`, so only the webhook runs code; everything else is static assets (`env.ASSETS`). Type-checked by `tsconfig.worker.json` (part of `tsc -b`). It imports `src/lib/finds.ts`, `src/lib/types.ts` and `src/data/plan.ts`: keep those free of DOM, React and `@/` imports.
- Bot behaviour (owner's chat only; others get "Your chat id is …"):
  - Link (with optional text): fetch title/description (YouTube/Vimeo via oEmbed), one AI call picks kind + 1–3 tags + chapter, upsert on `(user_id, url)`; the text becomes the note. Resending without text keeps the old note. Reply "Saved as video in English: …" plus the URL.
  - Reply to a message containing a link: appends the reply text to that find's note. The bot's own "Saved" reply includes the URL for this reason.
  - Plain text without a link: a note in the Notes tab. A first word naming a chapter (id or `CH[c].short`) picks it; otherwise AI picks; fallback `own`.
  - `/ai <link> [question]`: page text (~12k chars) → summary saved as the description. `/ai <question>`: AI answer, nothing saved. `/help`. Command menu set with Telegram `setMyCommands` (ai, help). `/note` and `/refile` were removed on purpose.
- Worker writes with the Supabase secret key (bypasses RLS) and sets `user_id` to `OWNER_USER_ID` itself. It reads the URL from `VITE_SUPABASE_URL` in `wrangler.jsonc` `vars` (runtime vars reach the worker, not the app).
- Secrets (`npx wrangler secret put <NAME>`, values via stdin): `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET` (checked against the `x-telegram-bot-api-secret-token` header; set with `setWebhook ... secret_token=`), `SUPABASE_SECRET_KEY` (`sb_secret_…`), `OWNER_USER_ID`, `TELEGRAM_CHAT_ID`. The local `.env` holds some under other names: `TG_BOT_TOKEN`, `SUPABASE` (secret key), `SUPABASE_V_DERENKO_USER_ID`. Never put secrets in `wrangler.jsonc` or anything prefixed `VITE_` (Vite inlines those into the bundle). Don't print their values.
- The worker answers Telegram at once and does the work in `ctx.waitUntil`, so slow pages don't cause retries. Logs: Cloudflare dashboard (observability is on). Webhook health: `getWebhookInfo`.

## Workers AI

- Binding `AI`. Model `@cf/meta/llama-3.3-70b-instruct-fp8-fast` with `response_format: { type: 'json_schema', ... }` for tagging and chapter picks. About 7–8 neurons a call; free tier is 10,000 neurons a day (resets 00:00 UTC). `/ai` on a long page is roughly 170.
- Models get retired: `@cf/meta/llama-3.1-8b-instruct` failed with `5028 ... deprecated on 2026-05-30`, silently (calls are wrapped in try/catch, so links saved without tags). If tags or chapters stop appearing, check the model first.
- `llama-3.1-8b-instruct-fp8` works but rejects JSON schema (`5025`) and filed notes badly. Some models return `response` as a parsed object, not a string; `run()` normalises it.
- To try a model or prompt, write a throwaway worker in the scratchpad with `"ai": { "binding": "AI" }` and run `npx --prefix <repo> wrangler dev --port 8799` (AI runs remotely, needs `wrangler login`), then `curl localhost:8799`.

## Notifications

`src/fx/notify.ts` fires a daily reminder from the open or installed app (checked each minute). True background push would need a sender (e.g. a Cloudflare cron with VAPID keys); `src/sw.ts` already handles `push` and `notificationclick`.
