# Compound

Personal self-development PWA (formerly Roadmap Log): Today (routines, one-off tasks and rows generated from tracks and habits), Tracks (skills with topics to tick, resources, projects), Notebook (notes, ideas and links), Lists, Wellbeing (mood and habit trackers), Settings. All content is editable and stored per user. A Telegram bot feeds the Notebook, and any AI can read and build tracks and lists through the API or MCP server. Live at https://roadmap.vasya-derenko.workers.dev (the worker is still called `roadmap`).

## Commands

- `npm run dev` / `npm run build` (runs `tsc -b` first) / `npm run lint` (oxlint) / `npm run preview`
- No test suite. To verify UI, build, run `vite preview`, and drive headless Chrome over CDP (`--remote-debugging-port`, Node's global `WebSocket`). Puppeteer/Playwright are not installed.
  - Use a fresh `--user-data-dir` each run, or an old service worker shows the "Updating the app" overlay.
  - Skip sign-in and seed data: on any page set `localStorage['roadmap-local-only'] = '1'` and `localStorage['roadmap-log-v2'] = JSON.stringify({ notes: [...], habits: [...], habitLogs: {...}, days: {...} })` (merged over `emptyState()`), then navigate. The starting content is added on first load (see Content).
  - Pure logic (derive.ts, habits.ts, seed.ts) can be run in Node: bundle a small script with `esbuild` (installed) using `alias: { '@': './src' }`.
- Worker: `npx wrangler dev --port 8799 --var SUPABASE_SECRET_KEY:… --var TELEGRAM_WEBHOOK_SECRET:x --var TELEGRAM_BOT_TOKEN:x`. Only `run_worker_first` paths reach the worker; to fire the cron locally use `--test-scheduled` with a temporary config that sets `"run_worker_first": true`, then `curl localhost:8799/__scheduled`. `.wrangler/` is gitignored.
- SQL can be checked in a throwaway Postgres: `docker run postgres:16-alpine`, stub `auth.users`, `auth.uid()` and the `anon`/`authenticated` roles, then apply the migrations in order.

## Stack

Vite 8 + React 19 + TypeScript 6, TanStack Router (code-based routes in `src/router.tsx`) and TanStack Query, shadcn/ui (new-york) on Tailwind v4, Supabase (Postgres + auth), vite-plugin-pwa (`injectManifest`, worker in `src/sw.ts`), Cloudflare Worker (`worker/`). Import alias `@/` → `src/`. `__BUILD__` (`{ time, commit }`) is defined in `vite.config.ts` and shown in Settings → About.

## Data flow

Everything the user changes is an `Op` (`src/lib/types.ts`):

1. `useStore().dispatch(op)` (`src/store/StoreProvider.tsx`) applies `reduce` (`src/store/reduce.ts`) to the cached Query state optimistically.
2. A mutation with `scope: { id: 'save' }` persists it via the active `Backend` (`src/store/backends.ts`), one at a time and in order.
3. Backends: `cloudBackend` (Supabase, one table per kind) when signed in; `localBackend` (one JSON blob in localStorage, key `roadmap-log-v2`) when the user picked device-only. Storage keys keep the old `roadmap-` prefix on purpose: renaming them would hide existing device data.

To add a new kind of data: add the `Op` variant and `State` field in `types.ts`, handle it in `reduce.ts`, in `cloudBackend.load`/`save`, `importLocal` and `importFile`, and add a migration with RLS (see Supabase).

Deploy order: the user runs a migration before you push code that reads or writes the new table or column. `cloudBackend.load` reads every table, and a missing table fails the whole load; a missing column fails saves (app and bot). Check with `curl "$VITE_SUPABASE_URL/rest/v1/<table>?select=<col>&limit=0" -H "apikey: $KEY"` (publishable key from `.env`; `[]` = exists).

- Content tables (`chapters`, `lists`, `routines`) keep each row as JSON in `data`; `settings.program` holds `{ seeded, focus }`.
- `state.plan` (table `plan_progress`) holds topic and resource ticks: item id → ISO date. `day_logs` holds each day's routine ticks (`done`) and `mood` (1–5).
- Habits are rows with real columns (table `habits`); one number per habit per day in `habit_logs` (`state.habitLogs`).
- Notes are not part of the loaded state: `useNotes(filter)` reads them 10 at a time through `Backend.notes` (filtering runs in Supabase), `useNoteCount` counts them, and saving a note invalidates the `['notes']` queries.
- Settings → Backup exports everything (state plus all notes) as JSON and imports a file (merged by id).
- No backward compatibility while the app is reworked: change data shapes directly. `normalizeState` (`src/lib/content.ts`) fills defaults and drops old-shape entries on load so pages don't crash.

## Content and model

Internally a track is a `Chapter` (UI says "Track"); `kind` is `learn` (learning track) or `general` (Personal).

- Starting content (`seedOps` in `src/data/seed.ts`, run by `useSeed` in `router.tsx`): Personal, one example English track (one skill, resource and project, and the focus) and a 🎬 Films list (`src/data/films.ts`). Nothing personal lives in the code; the owner's own roadmap is a backup file they imported. Bumping `SEED_VERSION` writes the starting items again by id (other content stays). The `plan-creator` skill in `.claude/skills` edited seed files that no longer exist.
- A track: About, goals, optional duration in months (`months`, counted from `created_at`), skills in order (each with topics), resources (grouped by kind), projects in order (code from the name's first two letters, e.g. `TE1`; size small/medium/big). No dates inside a track: next = first unticked topic (`nextUp`), current project = first not done. Pace = topics ticked over the last 4 weeks (`pace` in `src/lib/derive.ts`).
- Focus: one `learn` track (`settings.program.focus`), set with the button next to its name.
- Today (`todayItems` in `derive.ts`): routines due today, then "From your habits" (habit rows), then "From your tracks", generated rows with a `slot`: focus track's next topic, a light track (another learn track, rotating weekly), current project, next resource, a topic ticked 7 or 30 days ago to review, and a catch-up topic when the focus track is behind its target pace. Generated rows don't count for the streak.
- Routines with `core: true` make up the streak (new tasks default to it). A day counts when every core routine due that day, created by then, is ticked; days with none due are skipped (`streak` in `derive.ts`).
- Personal (`own`, kind `general`) is built in: the default track for notes and routines (and new tasks), listed under Other on Tracks, can't be deleted, can't be the focus, and is added back if missing.
- Wellbeing habits are skins over one shape (`Habit`): `type` gym / water / smoking (ready-made, one each) or build (21-day chain) / break (clean days), shared columns plus `custom_data` for what one type needs. The maths and Today rows are in `src/lib/habits.ts`; icons, labels and colours in `HABIT_UI` (`src/components/habits.tsx`); cards and the form in `src/views/Wellbeing.tsx`. Gym's goal is per week (a missed day can be caught up). Mood is per day (`day_logs.mood`), kept for charts later.
- Notebook entries are `Note` (table `notes`): `type` note/idea/link (link when the text holds a URL; idea via the `#idea` tag or the bot's AI), `body`, `url` (unique per user), `kind`, `context` (written by the bot's AI only, read-only in the app), `tags`, `chapter`, `source` (app/telegram/api).
- `Linkify` (`src/components/guide.tsx`) links project codes to `/tracks/<ch>#<code>`, "Chapter N" to the Nth learn track, and resource titles to their URLs. Keep codes verbatim in text so links work.

## Design system

The UI is a design system: every page is built from the same tokens and components. Follow it for every change, however small.

- **Tokens only.** All values come from the token layer at the top of `src/index.css`: colours (`--primary`, `--muted-foreground`, …, chapter palette `--p-*`, track-row slots `--slot-*`, habit types `--habit-*`, mood `--mood-*`), type scale (`--text-micro|caption|small|body|title|heading|stat|dial|page|hero`, also `text-*` classes), spacing (`--space-*`, a 4px grid; Tailwind `p-3`, `gap-2`… are the same steps), radii (`--radius-xs…xl`), shadow (`--shadow-card`), layers (`--z-*`), motion (`--dur-*`, `--ease-*`), sizes (`--icon-*`, `--control-*`). Never write a raw `px`, hex, `text-[13px]`, half step (`mb-3.5`) or Tailwind default size (`text-sm`). If no token fits, add one there rather than a one-off value.
- **Components first.** Build pages from `src/components/kit.tsx` (Header with `action`, Section, List, Row with `note`/`tagInline`, Entry with `onEdit`, Panel, Fold, Banner, Stats, LinkCard, InnerLink, Tabs, Chip with `icon`/`tone`, ChipLink, Chips, ChipsList, Badge, IconBadge, DoneButton, SettingRow, Segmented, Meter, Progress, Dot, SearchField, MoreText, Check…) and `src/components/edit.tsx` (FormSheet with `remove`, ConfirmSheet, fields, ChapterField, WeekdaysField, LinesField, RowEdit, PlusButton, Fab). Don't rebuild their markup by hand. When a pattern shows up a second time, promote it into kit/edit with a class named after the pattern (not the page) in `index.css`.
- **Change the shared piece.** To restyle something, change its token or component so every use follows; don't override it in one page. Watch for shared classes that set their own margin (e.g. `.lead`): put spacing on a wrapper.
- **One button size**: `Button` sizes all map to `--control-md`; don't pass `size` except `icon` for icon-only buttons.
- **Product copy vs user data.** Text that explains the app (help, empty states, labels) is fixed in code and the same for everyone. Users only fill in what the app lets them edit. Don't make system copy editable or store it per user.
- **Copy style:** plain, short sentences. Never use semicolons in user-facing text. Sentence case for labels ("Next project"); "Sign In"/"Sign Out" are title case.
- **Chips:** a filter bar above a list is a `ChipsList`: it wraps on wider screens and scrolls sideways on one line on phones. Chips inside cards and forms use `Chips`, which always wrap. A choice with its own icon and colour uses `Chip icon tone`.
- **Patterns:** create forms open from a `+` (PlusButton) on the right of the page header, in a FormSheet (centred dialog on desktop, bottom drawer on phones), never inline. Long text folds with MoreText. List inputs are `LinesField`. Days of the week use `WeekdaysField`; one choice of a few uses `Segmented`. Clickable cards (Notebook entries) open on a click anywhere, show a pencil and a hover state.
- **Top bar and page actions:** a page registers its bar with `usePageBar` (`src/components/bar.tsx`): `back` for inner pages, `actions` for the ⋯ menu (Edit first, Share, `danger` ones last in red), and `done` while editing, which swaps the ⋯ for a Done button. Pages without actions show no ⋯. In edit mode, rows show `RowEdit` (↑ ↓ ✎) and the page title becomes a button with a pencil (`Header action`) that opens the item's details.
- **Deleting:** inside the item's edit form (`FormSheet remove`: "Delete task/habit/…"), far left of the footer on desktop, a full-width row on phones, always confirmed in a `ConfirmSheet` (which dims the open form). Things with their own page (track, list) also have Delete in the ⋯ menu. No tap-twice deletes.
- **Toasts** show at the top. Single ticks don't toast (sound and burst only); milestones, saves, deletes and errors do.
- Chapter colours: each chapter picks a palette key; `ChapterColors` maps `--c-<id>` to it, and rows read `--c` (use `cvar(ch)`).
- Breakpoints (media queries can't use variables): phone ≤ 560px, compact ≤ 720px (bottom navigation instead of top tabs; wider screens put some card actions on the right).
- Themes: dark follows the system unless Settings forces one (`data-theme` on `<html>`, `src/fx/theme.ts`); dark tokens are defined under the media query and under `:root[data-theme="dark"]`.

## UI

- `src/components/ui/*` is shadcn-generated. When adding components with `npx shadcn@latest add …`, the CLI writes `import { cn } from "cn"`: change it to `@/lib/utils`. Sonner must not use `next-themes` (not installed). tailwind-merge treats unknown `text-*` classes as colours, so `button.tsx` sets its size with `text-(length:--text-small)`.
- Feedback is part of the product: `Check` and `DoneButton` play a sound and particle burst, `celebrate()` throws confetti and plays a fanfare, and choosing the focus plays `lockOn()` + `playFocus()` (`src/fx/`). Keep these on new tick-style interactions. Respect `prefers-reduced-motion`.
- Navigation: phones have a bottom bar (Today, Tracks, Notebook, Wellbeing, More → Lists, Settings); wider screens show the same views as tabs.
- Icons: `public/favicon.svg` is the source (dark tile with four growing dots). iOS and maskable icons must be full-bleed squares with no transparency (iOS fills transparency with white); render them with `rsvg-convert`.

## Supabase

- Migrations are applied by hand in the Supabase SQL Editor (no CLI), in order: `0001_schema.sql` (the whole schema for a fresh database), `0002_api_tokens.sql`, `0003_shares.sql`. Every table has `user_id default auth.uid()` and an "own rows" RLS policy. The editor warns "without RLS" because policies are created in a `do $$` loop; "Run and enable RLS" is fine. Changing a function's return columns needs `drop function` first.
- Auth: Google OAuth and email + password (email first on the sign-in page). Magic links were dropped: the built-in mailer allows about 2 emails an hour and on iOS links open outside the installed PWA.
- OAuth `redirectTo` is `/today`, not `/`, because the `/` route redirects and would drop the `?code=`.

## Share by link

- ⋯ → Share on a track or list page makes a snapshot (`trackSnapshot`/`listSnapshot`: content only, never ticks or notes) in table `shares` under a random id; the link is `/share/<id>` (`src/views/Share.tsx`). Settings → Shared links lists and deletes them.
- Links work for 7 days: `get_share(id)` (security definer, callable by anon) only returns newer ones and says whether the visitor owns it (`mine`); a daily worker cron deletes older rows. The table itself is only visible to its owner, so shares can't be listed.
- The share page opens without an account (`Shell` renders it when signed out). "Add to my tracks/lists" copies with fresh ids (`trackFromShare`/`listFromShare`); signing in from there (Google too) returns to the share via `PENDING_SHARE` in localStorage.

## AI access

- Settings → AI access makes personal access tokens (`rl_…`, shown once; table `api_tokens` stores the SHA-256 hash). A token has full access to its owner's data.
- `worker/api.ts` holds the operations (tracks and lists CRUD, routines, notes, habits, focus), with input checks, ids and project codes assigned server-side, and updates that keep ticks when ids are sent back. `worker/routes.ts` serves them as REST at `/api/v1` (OpenAPI at `/api/v1/openapi.json`, CORS on) and as an MCP server at `/mcp` (streamable HTTP, JSON responses; `Authorization: Bearer <token>` or `/mcp/<token>`). Tool names, descriptions and input schemas are in `TOOLS`.
- `public/llms.txt` tells AIs what a good track and list look like; keep it in sync with the tools.

## Env and deploy

- `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` and `VITE_TELEGRAM_BOT` (the bot's username): local `.env` (gitignored; see `.env.example`); in Cloudflare they're build variables (Settings → Build), because Vite inlines them at build time. Worker runtime `vars` do not reach the app.
- Push to `main` → Cloudflare Workers Builds runs `npm run build` and `npx wrangler deploy`. `wrangler.jsonc` serves `dist/` with SPA fallback, runs the worker first for `/tg`, `/api/*` and `/mcp`, and has a daily cron (`0 3 * * *`). Node 22 (`.node-version`).
- Without the env vars the app still builds and runs in device-only mode.

## PWA updates

`src/sw.ts` calls `skipWaiting()` + `clientsClaim()`, and `registerSW` (autoUpdate) reloads the page when a new worker activates. `main.tsx` also calls `reg.update()` on every return to the foreground and hourly, because iOS resumes installed PWAs without reloading. Don't remove these, or phones stay on old versions. Settings → About shows the build and an update button.

## Worker

- `worker/index.ts` is a Cloudflare Worker in the same deploy: the Telegram webhook (`/tg`), AI access (`/api/*`, `/mcp`) and `scheduled()` (daily cleanup: shares older than 7 days, unused Telegram codes). Everything else is static assets (`env.ASSETS`). Type-checked by `tsconfig.worker.json` (part of `tsc -b`). It imports `src/lib/content.ts`, `finds.ts` and `types.ts`: keep those free of DOM, React and `@/` imports.
- It writes with the Supabase secret key (bypasses RLS) and sets `user_id` itself. It reads the URL from `VITE_SUPABASE_URL` in `wrangler.jsonc` `vars`.
- Secrets (`npx wrangler secret put <NAME>`, values via stdin): `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET` (checked against the `x-telegram-bot-api-secret-token` header; set with `setWebhook ... secret_token=`), `SUPABASE_SECRET_KEY` (`sb_secret_…`). The local `.env` holds some under other names: `TG_BOT_TOKEN`, `SUPABASE` (secret key), `SUPABASE_V_DERENKO_USER_ID`. Never put secrets in `wrangler.jsonc` or anything prefixed `VITE_` (Vite inlines those into the bundle). Don't print their values.

## Telegram bot

- Settings → Connect Telegram: the app makes a one-time code (`telegram_codes`) and opens `t.me/<bot>?start=<code>`; the bot checks it (15 minutes) and saves the chat in `telegram_links`. Any account can connect one chat; an unlinked chat gets "Open Compound, then Settings → Connect Telegram".
- It reads the user's tracks from `chapters` (name and keywords help the AI; fallback: Personal).
- Bot behaviour, everything goes to the `notes` table:
  - Link (with optional text): fetch title/description (YouTube/Vimeo via oEmbed), one AI call picks kind + 1–3 tags + track, upsert a `link` on `(user_id, url)`; title and description go into `context`, the text into `body`. Resending without text keeps the old text. No track picked → Personal.
  - Reply to a message containing a link: appends the reply to that link's text. The bot's own "Saved" reply includes the URL for this reason.
  - Plain text: a first word naming a track picks it; one AI call picks the track (unless named), tags and whether it's an idea (`type: 'idea'` plus the `#idea` tag). Typed `#tags` are kept. Fallback track: Personal.
  - `/ai <link> [question]`: page text (~12k chars) → summary saved into `context`. `/ai <question>`: AI answer, nothing saved. `/help`. Command menu set with Telegram `setMyCommands` (ai, help).
- The worker answers Telegram at once and does the work in `ctx.waitUntil`, so slow pages don't cause retries. Logs: Cloudflare dashboard (observability is on). Webhook health: `getWebhookInfo`.

## Workers AI

- Binding `AI`. Model `@cf/meta/llama-3.3-70b-instruct-fp8-fast` with `response_format: { type: 'json_schema', ... }` for tagging and chapter picks. About 7–8 neurons a call; free tier is 10,000 neurons a day (resets 00:00 UTC). `/ai` on a long page is roughly 170.
- Models get retired: `@cf/meta/llama-3.1-8b-instruct` failed with `5028 ... deprecated on 2026-05-30`, silently (calls are wrapped in try/catch, so links saved without tags). If tags or chapters stop appearing, check the model first.
- `llama-3.1-8b-instruct-fp8` works but rejects JSON schema (`5025`) and filed notes badly. Some models return `response` as a parsed object, not a string; `run()` normalises it.
- To try a model or prompt, write a throwaway worker in the scratchpad with `"ai": { "binding": "AI" }` and run `npx --prefix <repo> wrangler dev --port 8799` (AI runs remotely, needs `wrangler login`), then `curl localhost:8799`.

## Notifications

`src/fx/notify.ts` fires a reminder at 20:00 from the open or installed app (checked each minute) while own tasks or habits are left; Settings only switches it on or off. True background push is planned in `TODO.md` (worker cron + VAPID); `src/sw.ts` already handles `push` and `notificationclick`.
