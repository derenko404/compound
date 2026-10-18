# Roadmap Log

Personal PWA for a self-development roadmap: Today (routines and one-off tasks), Tracks (skills with topics to tick, resources, projects), Notebook (notes, ideas and links), 100-item Lists, Wellbeing habits with trackers. All content is editable in the app and stored per user. A Telegram bot feeds the Notebook. Live at https://roadmap.vasya-derenko.workers.dev.

## Commands

- `npm run dev` / `npm run build` (runs `tsc -b` first) / `npm run lint` (oxlint) / `npm run preview`
- No test suite. To verify UI, build, run `vite preview`, and drive headless Chrome over CDP (`--remote-debugging-port`, Node's global `WebSocket`). Puppeteer/Playwright are not installed.
  - Use a fresh `--user-data-dir` each run, or an old service worker shows the "Updating the app" overlay.
  - Skip sign-in and seed data: on any page set `localStorage['roadmap-local-only'] = '1'` and `localStorage['roadmap-log-v2'] = JSON.stringify({ notes: [...] })` (merged over `emptyState()`), then navigate. The starting tracks, lists and routines are added on first load (see Content).

## Stack

Vite 8 + React 19 + TypeScript 6, TanStack Router (code-based routes in `src/router.tsx`) and TanStack Query, shadcn/ui (new-york) on Tailwind v4, Supabase (Postgres + auth), vite-plugin-pwa (`injectManifest`, worker in `src/sw.ts`). Import alias `@/` → `src/`.

## Data flow

Everything the user changes is an `Op` (`src/lib/types.ts`):

1. `useStore().dispatch(op)` (`src/store/StoreProvider.tsx`) applies `reduce` (`src/store/reduce.ts`) to the cached Query state optimistically.
2. A mutation with `scope: { id: 'save' }` persists it via the active `Backend` (`src/store/backends.ts`), one at a time and in order.
3. Backends: `cloudBackend` (Supabase, one table per kind) when signed in; `localBackend` (one JSON blob in localStorage, key `roadmap-log-v2`) when the user picked device-only.

To add a new kind of data: add the `Op` variant and `State` field in `types.ts`, handle it in `reduce.ts`, in `cloudBackend.load`/`save` and `importLocal`, and add a migration in `supabase/migrations/` with RLS (see below).

Deploy order: the user runs a migration before you push code that reads or writes the new table or column. `cloudBackend.load` uses `select('*')` per table, and a missing table fails the whole load; a missing column fails saves (app and bot). Check a column exists with `curl "$VITE_SUPABASE_URL/rest/v1/<table>?select=<col>&limit=0" -H "apikey: $KEY"` (publishable key from `.env`; `[]` = exists).

- Content tables (`chapters`, `lists`, `routines`) keep each row as JSON in `data`; `settings.program` holds `{ seeded, focus }`.
- `state.plan` (table `plan_progress`) holds topic and resource ticks: item id → ISO date.
- Notes are not part of the loaded state: `useNotes(filter)` reads them 10 at a time through `Backend.notes` (filtering runs in Supabase), `useNoteCount` counts them, and saving a note invalidates the `['notes']` queries.
- No backward compatibility while the app is reworked for new accounts: change data shapes directly. `normalizeState` (`src/lib/content.ts`) fills defaults and drops old-shape entries on load so pages don't crash.

## Content and model

Internally a track is a `Chapter` (UI says "Track"); `kind` is `learn` (roadmap track), `general` (Personal) or `health` (Wellbeing habit).

- Starting content: `src/data/plan.ts`, `guides.ts` and `lists.ts` are only sources for `seedOps` (`src/data/seed.ts`), which writes tracks, lists, routines and the starting focus into the user's data on first load (`useSeed` in `router.tsx`). Bumping `SEED_VERSION` replaces the starting content for everyone (ticks, notes and day logs stay). The roadmap doc: https://claude.ai/code/artifact/61482468-7024-4621-a941-2a770a3df94d (a Claude Docs doc; read it with the Claude Docs connector, not WebFetch). The `plan-creator` skill predates this and edits the seed files, not a user's data.
- A track: About, goals, optional duration in months (`months`, counted from `created_at`), skills in order (each with topics), standalone resources, projects in order (code from the name's first two letters, e.g. `TE1`; size small/medium/big). No dates inside a track: next = first unticked topic (`nextUp`), current project = first not done. Pace = topics ticked over the last 4 weeks (`pace` in `src/lib/derive.ts`).
- Focus: one `learn` track (`settings.program.focus`), set with the button next to its name. Routines with `fill: 'focus' | 'project'` show its next topic and current project on Today; `fill: 'light'` rotates weekly through the other learn tracks.
- Personal (`own`, kind `general`) is built in: the default track for notes and routines, listed under Other on Tracks, can't be deleted, can't be the focus, and is added back if missing.
- Routines with `core: true` make up the streak. A new core routine breaks every past streak.
- Notebook entries are `Note` (table `notes`): `type` note/idea/link (link when the text holds a URL; idea via the `#idea` tag or the bot's AI), `body`, `url` (unique per user), `kind`, `context` (written by the bot's AI only, read-only in the app), `tags`, `chapter`, `source`.
- `Linkify` (`src/components/guide.tsx`) links project codes to `/tracks/<ch>#<code>`, "Chapter N" to the Nth learn track, and resource titles to their URLs. Keep codes verbatim in text so links work.
- Fixed help text lives in code: `HOW_IT_WORKS` in `src/lib/content.ts` (shown at the bottom of Tracks).

## Design system

The UI is a design system: every page is built from the same tokens and components. Follow it for every change, however small.

- **Tokens only.** All values come from the token layer at the top of `src/index.css`: colours (`--primary`, `--muted-foreground`, …, chapter palette `--p-*`), type scale (`--text-micro|caption|small|body|title|heading|stat|dial|page|hero`, also `text-*` classes), spacing (`--space-*`, a 4px grid; Tailwind `p-3`, `gap-2`… are the same steps), radii (`--radius-xs…xl`, `rounded-*`), shadow (`--shadow-card`), layers (`--z-*`), motion (`--dur-*`, `--ease-*`), sizes (`--icon-*`, `--control-*`). Never write a raw `px`, hex, `text-[13px]`, half step (`mb-3.5`) or Tailwind default size (`text-sm`). If no token fits, add one there rather than a one-off value.
- **Components first.** Build pages from `src/components/kit.tsx` (Header, Section, List, Row, Entry, Panel, Fold, Banner, Stats, LinkCard, Chip/ChipLink/Chips/ChipsList, Dot, SearchField, MoreText, Check, Dial…) and `src/components/edit.tsx` (FormSheet, ConfirmSheet, fields, LinesField, RowEdit, PlusButton, Fab). Don't rebuild their markup by hand. When a pattern shows up a second time, promote it into kit/edit with a class in `index.css`.
- **Change the shared piece.** To restyle something, change its token or component so every use follows; don't override it in one page.
- **Product copy vs user data.** Text that explains the app (help, "How it works", empty states, labels) is fixed in code and the same for everyone. Users only fill in what the app lets them edit (tracks, routines, lists, trackers, notes). Don't make system copy editable or store it per user.
- **Chips:** a filter bar above a list is a `ChipsList`: it wraps on wider screens and scrolls sideways on one line on phones. Chips inside cards and forms (tags, quick values, pickers) use `Chips`, which always wrap.
- **Patterns:** create forms open from a `+` (PlusButton) in a FormSheet (centred dialog on desktop, bottom drawer on phones), never inline on the page. Long text folds with MoreText. List inputs are `LinesField` (Enter or the ↵ button adds an entry; `quick` offers one-tap values); placeholders don't mention Enter.
- **Top bar and page actions:** a page registers its bar with `usePageBar` (`src/components/bar.tsx`): `back` for inner pages, `actions` for the ⋯ menu (Edit first, `danger` ones last in red), and `done` while editing, which swaps the ⋯ for a Done button. Pages without actions show no ⋯. Settings is in More (phones) or the last tab (desktop), not in the ⋯ menu.
- **Deleting:** small items use the tap-twice ConfirmButton; things that are hard to lose (a track, a notebook entry) ask in a `ConfirmSheet` (`FormSheet`'s `confirmDelete`).
- Chapter colours: each chapter picks a palette key; `ChapterColors` maps `--c-<id>` to it, and rows read `--c` (use `cvar(ch)`).
- Breakpoints (media queries can't use variables): phone ≤ 560px, compact ≤ 720px (bottom navigation instead of top tabs).

## UI

- `src/components/ui/*` is shadcn-generated. When adding components with `npx shadcn@latest add …`, the CLI writes `import { cn } from "cn"`: change it to `@/lib/utils`. Sonner must not use `next-themes` (not installed).
- Feedback is part of the product: `Check` plays a sound and particle burst, `celebrate()` throws confetti and plays a fanfare, and choosing the focus plays `lockOn()` + `playFocus()` (`src/fx/`). Keep these on new tick-style interactions. Respect `prefers-reduced-motion`.
- Navigation: phones have a bottom bar (Today, Tracks, Notebook, Wellbeing, More → Lists, Settings); wider screens show the same views as tabs.

## Supabase

- Migrations are applied by hand in the Supabase SQL Editor (no CLI). `0004_dynamic_content.sql` (content tables) and `0005_notebook.sql` (notes columns) must run before this branch deploys. Old tables (`bookmarks`, `ideas`, `idea_notes`, `custom_tasks`, `list_items`) are no longer read; dropping them is in `TODO.md`. Every table has `user_id default auth.uid()` and an "own rows" RLS policy. The editor warns "without RLS" because policies are created in a `do $$` loop; "Run and enable RLS" is fine.
- Auth: Google OAuth and email + password. Magic links were dropped: the built-in mailer allows about 2 emails an hour (`over_email_send_rate_limit`) and on iOS links open outside the installed PWA.
- OAuth `redirectTo` is `/today`, not `/`, because the `/` route redirects and would drop the `?code=`.

## Env and deploy

- `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`: local `.env` (gitignored; see `.env.example`); in Cloudflare they're build variables (Settings → Build), because Vite inlines them at build time. Worker runtime `vars` do not reach the app.
- Push to `main` → Cloudflare Workers Builds runs `npm run build` and `npx wrangler deploy`. `wrangler.jsonc` serves `dist/` with SPA fallback. Node 22 (`.node-version`).
- Without the env vars the app still builds and runs in device-only mode.

## PWA updates

`src/sw.ts` calls `skipWaiting()` + `clientsClaim()`, and `registerSW` (autoUpdate) reloads the page when a new worker activates. `main.tsx` also calls `reg.update()` on every return to the foreground and hourly, because iOS resumes installed PWAs without reloading. Don't remove these, or phones stay on old versions.

## Telegram bot

- `worker/index.ts` is a Cloudflare Worker in the same deploy. `wrangler.jsonc` sets `run_worker_first: ["/tg"]`, so only the webhook runs code; everything else is static assets (`env.ASSETS`). Type-checked by `tsconfig.worker.json` (part of `tsc -b`). It imports `src/lib/finds.ts`, `src/lib/types.ts` and `src/data/plan.ts`: keep those free of DOM, React and `@/` imports.
- It reads the user's tracks from the `chapters` table (name and keywords help the AI); until that has rows it falls back to `plan.ts`.
- Bot behaviour (owner's chat only; others get "Your chat id is …"), everything goes to the `notes` table:
  - Link (with optional text): fetch title/description (YouTube/Vimeo via oEmbed), one AI call picks kind + 1–3 tags + track, upsert a `link` on `(user_id, url)`; title and description go into `context`, the text into `body`. Resending without text keeps the old text. No track picked → Personal.
  - Reply to a message containing a link: appends the reply to that link's text. The bot's own "Saved" reply includes the URL for this reason.
  - Plain text: a first word naming a track picks it; one AI call picks the track (unless named), tags and whether it's an idea (`type: 'idea'` plus the `#idea` tag). Typed `#tags` are kept. Fallback track: Personal.
  - `/ai <link> [question]`: page text (~12k chars) → summary saved into `context`. `/ai <question>`: AI answer, nothing saved. `/help`. Command menu set with Telegram `setMyCommands` (ai, help).
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
