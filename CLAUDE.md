# Compound

Personal self-development PWA (formerly Roadmap Log): Today (routines, one-off tasks and rows generated from topics and habits), Topics (skills with steps to tick, resources, projects), Notebook (notes, ideas and links), Lists, Wellbeing (mood and habit trackers), Timer, Settings. All content is editable and stored per user. A Telegram bot feeds the Notebook, and any AI can read and build topics and lists through the API or MCP server. Live at https://roadmap.vasya-derenko.workers.dev (the worker is still called `roadmap`).

## Commands

- `npm run dev` / `npm run build` (runs `tsc -b` first) / `npm run lint` / `npm run preview`
- `npm run lint` runs oxlint and three checks in `scripts/`: `scripts/lint/i18n.mjs` (no raw user-facing text), `scripts/lint/layers.mjs` (import rules, see Architecture) and `scripts/lint/comments.mjs` (comment style). All must pass.
- No test suite. To verify UI, build, run `vite preview`, and drive headless Chrome over CDP (`--remote-debugging-port`, Node's global `WebSocket`). Puppeteer/Playwright are not installed.
  - Use a fresh `--user-data-dir` each run, or an old service worker shows the "Updating the app" overlay.
  - Skip sign-in and seed data: on any page set `localStorage['roadmap-local-only'] = '1'` and `localStorage['roadmap-log-v2'] = JSON.stringify({ notes: [...], habits: [...], habitLogs: {...}, days: {...} })` (merged over `emptyState()`), then navigate. The starting content is added on first load (see Content).
  - Services, endpoints and the bot run in Node without Supabase: bundle a small script with `esbuild` (installed), give it a fake `localStorage`, and build services over `LocalRepositories.create()`. Endpoints can be called through `Router.handle` or `invoke`, the bot through `TelegramBotService.handle` with fake `AiPort`/`PageReaderPort`/link repository.
- Worker: `npx wrangler dev --port 8799 --var SUPABASE_SECRET_KEY:… --var TELEGRAM_WEBHOOK_SECRET:x --var TELEGRAM_BOT_TOKEN:x`. Only `run_worker_first` paths reach the worker; to fire the cron locally use `--test-scheduled` with a temporary config that sets `"run_worker_first": true`, then `curl localhost:8799/__scheduled`. `npx wrangler deploy --dry-run --outdir <dir>` checks the worker bundles. `.wrangler/` is gitignored.
- SQL can be checked in a throwaway Postgres: `docker run postgres:16-alpine`, stub `auth.users`, `auth.uid()` and the `anon`/`authenticated` roles, then apply the migrations in order.

## Stack

Vite 8 + React 19 + TypeScript 6, TanStack Router (code-based routes in `src/app/router.tsx`) and TanStack Query, shadcn/ui (new-york) on Tailwind v4, Supabase (Postgres + auth), vite-plugin-pwa (`injectManifest`, worker in `src/app/sw.ts`), Cloudflare Worker (`worker/`), zod (the worker's input schemas). Import aliases: `@/` → `src/`, `@core/` → `core/`, `@adapters/` → `adapters/` (the worker imports those two relatively). `__BUILD__` (`{ time, commit }`) is defined in `vite.config.ts` and shown in Settings → About.

## Architecture

```
core/          business logic, no DOM or React, shared by the app and the worker
  domain/      types, rules (content.ts, links.ts, notes.ts, reduce.ts), AppError
  ports/       interfaces: XxxRepositoryPort (one per table), AiPort, PageReaderPort, MessengerPort…
  services/    classes with ports injected: StateService, TopicService, ListService, RoutineService,
               NoteService, HabitService, FocusService, ShareService, ApiTokenService, BackupService,
               TelegramConnectService, NoteFilerService, TelegramBotService, CleanupService
adapters/      implementations of the ports
  supabase/    SupabaseTable base + one *.repository.ts per table; SupabaseRepositories.create(db, userId?)
  local/       LocalStore (the device's JSON blob) + Local*Repository; LocalRepositories.create()
  cloudflare/  WorkersAiClient   web/ FetchPageReader   telegram/ TelegramClient
worker/        index.ts is the composition root; lib/http (Endpoint builder, Router); api/ (endpoints);
               telegram/ (webhook transport); env.ts
src/           the app, lighter Feature-Sliced Design: app → pages → features → shared
  app/         entry (main.tsx), router, ui/ (Shell, TopBar, BottomNav, tabs), seed/, styles/, sw.ts
  pages/       one slice per route; page-local components live in the page's ui/
  features/    topics, notes, habits, today, timer, share-link, auth, ai-access, telegram-connect, backup
  shared/      ui/ (one component per file + primitives/ from shadcn), store/, api/, lib/, i18n/
```

- **Layers** (enforced by `scripts/lint/layers.mjs`): imports only point down, core < adapters < shared < features < pages < app. Pages never import other pages. Another slice is imported through its public `index.ts` (`@/features/topics`), never a file inside it; features may use each other that way. Adapters are wired only in `src/shared/api` and `src/app` (and the worker). A line that must break a rule ends with `// layers-ok` and says why.
- **Where code goes:** a component used by one page stays in that page's `ui/`. Something reused, or with its own data (a Settings section, habit logging), becomes a feature. Shared UI pieces go to `src/shared/ui` and are exported from its `index.ts` (files inside `shared/ui` import each other relatively, never through the barrel).
- **Core is object-oriented:** services are classes taking their ports (or a `Repositories` bundle) in the constructor. Ports are `XxxRepositoryPort`/`XxxPort` interfaces, adapters are `SupabaseXxxRepository`/`LocalXxxRepository` classes in `xxx.repository.ts`, services are `XxxService` in `xxx.service.ts`. Data stays plain typed objects (it's stored and sent as JSON). Errors callers should see are `AppError(status, message)` (`fail()`).

## Conventions

- **Helper libraries export one namespace object**, not loose functions: `export const dates = { keyOf, parseKey, … }`, used as `dates.keyOf()`. Same for `links` (`core/domain/links.ts`) and `noteSearch`. Types and React components stay named exports. shadcn's `cn()` is the exception.
- **Comments:** a comment over more than one line is a JSDoc block (`/** … */`, ` * ` per line); a single-line comment is `//`. Tool directives (`// oxlint-…`, `// i18n-ok`, `// layers-ok`) stay line comments. `scripts/lint/comments.mjs` enforces it.
- Names say what things are: `getDbFrom(env)`, not `dbFor`; folders named after what they hold (`shared/lib/celebrate.ts`, not `fx/`).

## Data flow

Everything the user changes is an `Op` (`core/domain/types.ts`):

1. `useStore().dispatch(op)` (`src/shared/store/StoreProvider.tsx`) applies `reduce` (`core/domain/reduce.ts`) to the cached Query state optimistically.
2. A mutation with `scope: { id: 'save' }` persists it via the active `Backend` (`src/shared/api/backends.ts`), one at a time and in order.
3. A `Backend` is a thin wrapper over a `Repositories` bundle and `StateService` (`load`, `apply(op, next)`): Supabase repositories when signed in, local ones (one JSON blob in localStorage, key `roadmap-log-v2`) when the user picked device-only. Storage keys keep the old `roadmap-` prefix on purpose: renaming them would hide existing device data.

To add a new kind of data: add the `Op` variant and `State` field in `core/domain/types.ts`, handle it in `core/domain/reduce.ts`, add a repository port in `core/ports/repositories.ts` with Supabase and local adapters (register them in both `*Repositories.create`), load and save it in `StateService`, add it to `BackupService.ops`, and add a migration with RLS (see Supabase).

Deploy order: the user runs a migration before you push code that reads or writes the new table or column. `StateService.load` reads every table, and a missing table fails the whole load; a missing column fails saves (app and bot). Check with `curl "$VITE_SUPABASE_URL/rest/v1/<table>?select=<col>&limit=0" -H "apikey: $KEY"` (publishable key from `.env`; `[]` = exists).

- Content tables (`topics`, `lists`, `routines`) keep each row as JSON in `data`; `settings.program` holds `{ seeded, focus }`.
- `state.plan` (table `plan_progress`) holds step and resource ticks: item id → ISO date. `day_logs` holds each day's routine ticks (`done`) and `mood` (1–5).
- Habits are rows with real columns (table `habits`); one number per habit per day in `habit_logs` (`state.habitLogs`).
- Notes are not part of the loaded state: `useNotes(filter)` reads them 10 at a time through `Backend.notes` (filtering runs in Supabase), `useNoteCount` counts them, and saving a note invalidates the `['notes']` queries.
- Settings → Backup (`features/backup`, `BackupService`) exports everything (state plus all notes) as JSON and imports a file, item by item through `StateService` (merged by id), for the cloud and the device alike.
- No backward compatibility while the app is reworked: change data shapes directly. `normalizeState` (`core/domain/content.ts`) fills defaults and drops old-shape entries on load so pages don't crash.

## Content and model

A topic is a `Topic` everywhere (UI, code, API, table `topics`); the old "track"/"chapter" names are gone (migration `0004_topics.sql`). The ticks inside a skill are `steps`. `kind` is `learn` (learning topic) or `general` (Personal).

- Starting content (`seedOps` in `src/app/seed/seed.ts`, run by `useSeed` in `src/app/seed/use-seed.ts`): Personal, one example English topic (one skill, resource and project, and the focus) and a 🎬 Films list (`src/app/seed/films.ts`). Nothing personal lives in the code; the owner's own roadmap is a backup file they imported. Bumping `SEED_VERSION` writes the starting items again by id (other content stays). The `plan-creator` skill in `.claude/skills` edited seed files that no longer exist.
- A topic: About, goals, optional duration in months (`months`, counted from `created_at`), skills in order (each with steps), resources (grouped by kind), projects in order (code from the name's first two letters, e.g. `TE1`; size small/medium/big; projects also have their own `steps` checklist). No dates inside a topic: next = first unticked step (`nextUp`), current project = first not done. Pace = steps ticked over the last 4 weeks (`pace` in `src/features/today/model/derive.ts`).
- Focus: one `learn` topic (`settings.program.focus`), set with the button next to its name.
- Today (`todayItems` in `derive.ts`): routines due today, then "From your habits" (habit rows), then "From your topics", generated rows with a `slot`: focus topic's next step, a light topic (another learn topic, rotating weekly), current project, next resource, a step ticked 7 or 30 days ago to review, and a catch-up step when the focus topic is behind its target pace. Generated rows don't count for the streak.
- Routines with `core: true` make up the streak (new tasks default to it). A day counts when every core routine due that day, created by then, is ticked; days with none due are skipped (`streak` in `derive.ts`).
- Personal (`own`, kind `general`) is built in: the default topic for notes and routines (and new tasks), listed under Other on Topics, can't be deleted, can't be the focus, and is added back if missing.
- Wellbeing habits are skins over one shape (`Habit`): `type` gym / water / smoking (ready-made, one each) or build (21-day chain) / break (clean days), shared columns plus `custom_data` for what one type needs. In `src/features/habits`: the maths and Today rows (`model/habits.ts`), icons, labels and colours (`HABIT_UI` in `ui/habit-ui.tsx`), each type's card content (`ui/habit-skin.tsx`), the card and logging (`habit-card.tsx`, `habit-log.tsx`). The form and mood widget are page-local in `src/pages/wellbeing/ui`. Gym's goal is per week (a missed day can be caught up). Mood is per day (`day_logs.mood`), kept for charts later.
- Notebook entries are `Note` (table `notes`): `type` note/idea/link (link when the text holds a URL; idea via the `#idea` tag or the bot's AI), `body`, `url` (unique per user), `kind`, `context` (written by the bot's AI only, read-only in the app), `tags`, `topic`, `source` (app/telegram/api).
- `Linkify` (`src/features/topics/ui/linkify.tsx`) links project codes to `/topics/<ch>#<code>`, "Topic N" to the Nth learn topic, and resource titles to their URLs. Keep codes verbatim in text so links work.
- Timer (`src/pages/timer`, logic in `src/features/timer/model/timer.ts`): a Short / Long / Custom countdown (defaults 5 and 30 min, custom 1–180) with an optional generated background sound (`playAmbient` in `src/shared/lib/sound.ts`). It keeps running across pages and reloads (state and settings in localStorage, this device only, only changed settings stored), shows a pill in the top bar elsewhere, and ends with a fanfare, confetti and a notification. Nothing reaches the account.

## Languages (i18n)

- English and Ukrainian. Every user-facing string comes from `t` (`import { t, plural, currentLocale } from '@/shared/i18n'`): `t.today.title`, `t.common.days(3)`. Dictionaries live in `src/shared/i18n/en/<area>.ts` (the shape) and `src/shared/i18n/uk/<area>.ts` (typed `typeof en['<area>']`, so a missing key fails `tsc`). Shared words (Save, Cancel, Delete…) are in `common`. Interpolation is a function in the dictionary. Plurals use `plural(n, { one, few, many, other })` (Ukrainian needs one/few/many). Dates and numbers use `currentLocale()`.
- Settings → Language: Auto (the device's language, else English), English, Українська. Per device (`roadmap-lang`). Changing it reloads the app, so module-level strings are safe.
- Never translated: what users type, the starting content once created, the brand "Compound", the Telegram bot, the API/MCP and `llms.txt`. `core/` never imports the app's i18n: translate its ids at the call site (`t.topics.resourceKinds[id]`).
- `npm run lint` fails on raw text: `react/jsx-no-literals` catches text between tags, and `scripts/lint/i18n.mjs` catches literals in user-facing props (`aria-label`, `title`, `placeholder`, `label`…) and in `toast()`/`fail()`. A line that must keep a literal ends with `// i18n-ok`.
- Ukrainian terms: Тема, Навичка, Крок, Ресурс, Проєкт, Нотатник, Список, Самопочуття, Звичка, Завдання, Таймер. Polite plural imperative ("Додайте"), sentence case, ʼ for the apostrophe.

## Design system

The UI is a design system: every page is built from the same tokens and components. Follow it for every change, however small.

- **Tokens only.** All values come from the token layer at the top of `src/app/styles/index.css`: colours (`--primary`, `--muted-foreground`, …, topic palette `--p-*`, Today's topic-row slots `--slot-*`, habit types `--habit-*`, mood `--mood-*`), type scale (`--text-micro|caption|small|body|title|heading|stat|dial|page|hero`, also `text-*` classes), spacing (`--space-*`, a 4px grid; Tailwind `p-3`, `gap-2`… are the same steps), radii (`--radius-xs…xl`), shadow (`--shadow-card`), layers (`--z-*`), motion (`--dur-*`, `--ease-*`), sizes (`--icon-*`, `--control-*` with `--control-field` for form fields, `--dial-lg`, `--setting-text`). Never write a raw `px`, hex, `text-[13px]`, half step (`mb-3.5`) or Tailwind default size (`text-sm`). If no token fits, add one there rather than a one-off value.
- **Components first.** Build pages from `@/shared/ui` (one component per file, all exported from its `index.ts`): Header with `action`, Section, List, SortList, Row with `note`/`tagInline`/`onOpen`/`sort`/`chevron`, Entry with `onEdit`/`remove`, Panel, Fold, Banner, Stats, LinkCard, InnerLink, Tabs, Chip with `icon`/`tone`, ChipLink, Chips, ChipsList, Badge, IconBadge, DoneButton, SettingRow, SettingSelect, Segmented, Meter (`size="lg"`, striped when empty), Progress, Dial (`value`, `size="lg"`), Stepper, CountRow, CopyButton, Dot, SearchField, MoreText, Check, PlusButton, `cvar()`/`tone()` for colour; forms from `@/shared/ui` too (FormSheet, ConfirmSheet, RemoveButton, the fields, TopicField, WeekdaysField, LinesField, `moveTo`, `useSheet`, `fail`). Don't rebuild their markup by hand. When a pattern shows up a second time, promote it into `src/shared/ui` with a class named after the pattern (not the page) in `index.css`.
- **Change the shared piece.** To restyle something, change its token or component so every use follows; don't override it in one page. Watch for shared classes that set their own margin (e.g. `.lead`): put spacing on a wrapper. Same for `line-clamp-*`: never on a padded box (the next line shows in the padding), clamp an inner element.
- **One button size**: `Button` sizes all map to `--control-md`; don't pass `size` except `icon` for icon-only buttons.
- **Product copy vs user data.** Text that explains the app (help, empty states, labels) is fixed in code and the same for everyone. Users only fill in what the app lets them edit. Don't make system copy editable or store it per user.
- **Copy style:** plain, short sentences. Never use semicolons in user-facing text. Sentence case for labels ("Next project"); "Sign In"/"Sign Out" are title case.
- **Chips:** a filter bar above a list is a `ChipsList`: it wraps on wider screens and scrolls sideways on one line on phones. Chips inside cards and forms use `Chips`, which always wrap. A choice with its own icon and colour uses `Chip icon tone`.
- **Patterns:** create forms open from the page's `+` in the top bar (`usePageBar add`, a plain primary-colour `PlusButton` left of Edit, as on iOS; on a topic page it adds to the open tab), in a FormSheet (centred dialog on desktop, bottom drawer on phones that fits its content and slides up), never inline. Long text folds with MoreText. List inputs are `LinesField`. Days of the week use `WeekdaysField`; one choice of a few uses `Segmented`, a choice with long labels (theme, language) a `SettingSelect`. Clickable cards (Notebook entries) open on a click anywhere, show a › and a hover state. A count toward a goal (water glasses) is a `CountRow`, `− value +` is a `Stepper`. Copying uses `CopyButton` (it says Copied, no toast). Interactions follow iOS: when unsure, do what iOS does.
- **Top bar and page actions:** a page registers its bar with `usePageBar` (`src/shared/ui/page-bar.tsx`): `back` for inner pages, `add` for the page's +, `edit` for an Edit text button at the far right, `actions` for the ⋯ menu left of it (Share, `danger` ones last in red; a fitted bottom drawer of big buttons on phones, a dropdown on wider screens), and `done` while editing, which swaps Edit and ⋯ for a bold Done in the same place. Pages without actions show no ⋯.
- **Edit mode (iOS):** ticks hide; each row shows a red ⊖ (`RemoveButton` in the `check` slot), opens its form on a tap with a › (`Row onOpen`), and drags by a ≡ handle inside a `SortList` (`Row sort`; ↑ ↓ keys on the handle too). The page title becomes a button with a pencil (`Header action`) that opens the item's details. Notebook cards get ⊖ through `Entry remove`. Icons on rows and cards are centred on their height.
- **Deleting:** in edit mode, with the row's ⊖, always confirmed in a `ConfirmSheet`. Forms don't delete. Things with their own page (topic, list) also have Delete in the ⋯ menu. Personal has no ⊖.
- **Toasts** (`src/shared/lib/toast.ts`) show at the top, and only for errors (including form checks via `fail`). Saves, deletes, milestones and copies don't toast: sound, burst, confetti or the control itself confirm them.
- Topic colours: each topic picks a palette key; `TopicColors` maps `--c-<id>` to it, and rows read `--c` (use `cvar(ch)`, or `tone(token)` for a colour token).
- Breakpoints (media queries can't use variables): phone ≤ 560px, compact ≤ 720px (bottom navigation instead of top tabs; wider screens put some card actions on the right).
- Themes: dark follows the system unless Settings forces one (`data-theme` on `<html>`, `src/shared/lib/theme.ts`); dark tokens are defined under the media query and under `:root[data-theme="dark"]`.

## UI

- `src/shared/ui/primitives/*` is shadcn-generated (`components.json` points there). When adding components with `npx shadcn@latest add …`, the CLI writes `import { cn } from "cn"`: change it to `@/shared/lib/utils`. Sonner must not use `next-themes` (not installed). tailwind-merge treats unknown `text-*` classes as colours, so `button.tsx` sets its size with `text-(length:--text-small)`.
- Feedback is part of the product: `Check` and `DoneButton` play a sound and particle burst, `celebrate()` throws confetti and plays a fanfare, and choosing the focus plays `lockOn()` + `playFocus()` (`src/shared/lib/celebrate.ts`, `sound.ts`). Keep these on new tick-style interactions. Respect `prefers-reduced-motion`.
- Navigation: phones have a bottom bar (Today, Topics, Notebook, Wellbeing, More → Lists, Timer, Settings); wider screens show the same views as tabs (`src/app/ui/tabs.ts`).
- Icons: `public/favicon.svg` is the source (dark tile with four growing dots). iOS and maskable icons must be full-bleed squares with no transparency (iOS fills transparency with white); render them with `rsvg-convert`.

## Supabase

- Migrations are applied by hand in the Supabase SQL Editor (no CLI), in order: `0001_schema.sql` (the whole schema for a fresh database), `0002_api_tokens.sql`, `0003_shares.sql`, `0004_topics.sql` (tracks → topics, topics → steps). Every table has `user_id default auth.uid()` and an "own rows" RLS policy. The editor warns "without RLS" because policies are created in a `do $$` loop; "Run and enable RLS" is fine. Changing a function's return columns needs `drop function` first.
- Auth: Google OAuth and email + password (email first on the sign-in page, `src/features/auth`). Magic links were dropped: the built-in mailer allows about 2 emails an hour and on iOS links open outside the installed PWA.
- OAuth `redirectTo` is `/today`, not `/`, because the `/` route redirects and would drop the `?code=`.

## Share by link

- ⋯ → Share on a topic or list page makes a snapshot (`topicSnapshot`/`listSnapshot`: content only, never ticks or notes) in table `shares` under a random id (`ShareService`); the link is `/share/<id>` (`src/pages/share`). Settings → Shared links (`features/share-link`) lists and deletes them.
- Links work for 7 days: `get_share(id)` (security definer, callable by anon) only returns newer ones and says whether the visitor owns it (`mine`); a daily worker cron deletes older rows. The table itself is only visible to its owner, so shares can't be listed.
- The share page opens without an account (`Shell` renders it when signed out). "Add to my topics/lists" copies with fresh ids (`topicFromShare`/`listFromShare`); signing in from there (Google too) returns to the share via `PENDING_SHARE` (`features/auth`) in localStorage.

## AI access

- Settings → AI access (`features/ai-access`, `ApiTokenService`) makes personal access tokens (`rl_…`, shown once; table `api_tokens` stores the SHA-256 hash). A token can read, create and change its owner's data, never delete: there are no delete operations, and updates keep items they don't mention (`keep` in `core/services/keep.ts`). Deleting is only in the app.
- Endpoints are declared once with the `Endpoint` builder (`worker/lib/http`, modelled on the owner's endpoint lib): `.route(path, method)`, `.status()`, `.asTool(name, description)`, `.addGuard(authenticated)`, `.addParamsValidation(zodParams(…))`, `.addBodyValidation(zodBody(…))`, `.addQueryValidation(zodQuery(…))`, `.handler(({ body, params, query, ctx }) => data)`, `.build()`. Handlers return data and call the domain services through `ctx.services` (`ApiContext`, scoped to the token's user). One file per operation in `worker/api/<feature>/`, registered in `worker/api/index.ts`. Errors come back as `{ error, issues? }`.
- `ApiServer` serves them three ways from the same definitions: REST at `/api/v1` (CORS on), an MCP server at `/mcp` (streamable HTTP, JSON responses; `Authorization: Bearer <token>` or `/mcp/<token>`; tools are the endpoints marked `asTool`, called through `invoke`), and `/api/v1/openapi.json` generated from the zod schemas (`worker/api/schemas.ts`, which also keep the lenient input: trim, cut to length, drop unknown values).
- `public/llms.txt` tells AIs what a good topic and list look like, how to prepare one and find resources; keep it in sync with the tools.

## Env and deploy

- `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` and `VITE_TELEGRAM_BOT` (the bot's username): local `.env` (gitignored; see `.env.example`); in Cloudflare they're build variables (Settings → Build), because Vite inlines them at build time. Worker runtime `vars` do not reach the app.
- Push to `main` → Cloudflare Workers Builds runs `npm run build` and `npx wrangler deploy`. `wrangler.jsonc` serves `dist/` with SPA fallback, runs the worker first for `/tg`, `/api/*` and `/mcp`, and has a daily cron (`0 3 * * *`). Node 22 (`.node-version`).
- Without the env vars the app still builds and runs in device-only mode.

## PWA updates

`src/app/sw.ts` calls `skipWaiting()` + `clientsClaim()`, and `registerSW` (autoUpdate) reloads the page when a new worker activates. `src/app/main.tsx` also calls `reg.update()` on every return to the foreground and hourly, because iOS resumes installed PWAs without reloading. Don't remove these, or phones stay on old versions. Settings → About shows the build and an update button.

## Worker

- `worker/index.ts` is the composition root of a Cloudflare Worker in the same deploy: it builds clients and services and routes the Telegram webhook (`/tg`, `worker/telegram/webhook.ts` → `TelegramBotService`), AI access (`/api/*`, `/mcp`, `ApiServer`) and `scheduled()` (`CleanupService`: shares older than 7 days, unused Telegram codes). Everything else is static assets (`env.ASSETS`). Type-checked by `tsconfig.worker.json` (part of `tsc -b`), which covers `worker/`, `core/` and `adapters/`: keep those free of DOM, React and `@/` imports.
- It writes with the Supabase secret key (bypasses RLS), so every repository is created with the user's id (`SupabaseRepositories.create(db, userId)`) and filters and writes `user_id` itself. It reads the URL from `VITE_SUPABASE_URL` in `wrangler.jsonc` `vars`.
- Secrets (`npx wrangler secret put <NAME>`, values via stdin): `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET` (checked against the `x-telegram-bot-api-secret-token` header; set with `setWebhook ... secret_token=`), `SUPABASE_SECRET_KEY` (`sb_secret_…`). The local `.env` holds some under other names: `TG_BOT_TOKEN`, `SUPABASE` (secret key), `SUPABASE_V_DERENKO_USER_ID`. Never put secrets in `wrangler.jsonc` or anything prefixed `VITE_` (Vite inlines those into the bundle). Don't print their values.

## Telegram bot

- Settings → Connect Telegram (`features/telegram-connect`, `TelegramConnectService`): the app makes a one-time code (`telegram_codes`) and opens `t.me/<bot>?start=<code>`; the bot checks it (15 minutes) and saves the chat in `telegram_links`. Any account can connect one chat; an unlinked chat gets "Open Compound, then Settings → Connect Telegram".
- `TelegramBotService` (`core/services`) decides what a message does and returns the reply text; `NoteFilerService` holds the AI prompts; `TelegramWebhook` is only the transport. It reads the user's topics from `topics` (name and keywords help the AI; fallback: Personal).
- Bot behaviour, everything goes to the `notes` table:
  - Link (with optional text): fetch title/description (`FetchPageReader`; YouTube/Vimeo via oEmbed), one AI call picks kind + 1–3 tags + topic, save a `link` once per `(user_id, url)`; title and description go into `context`, the text into `body`. Resending without text keeps the old text. No topic picked → Personal.
  - Reply to a message containing a link: appends the reply to that link's text. The bot's own "Saved" reply includes the URL for this reason.
  - Plain text: a first word naming a topic picks it; one AI call picks the topic (unless named), tags and whether it's an idea (`type: 'idea'` plus the `#idea` tag). Typed `#tags` are kept. Fallback topic: Personal.
  - `/ai <link> [question]`: page text (~12k chars) → summary saved into `context`. `/ai <question>`: AI answer, nothing saved. `/help`. Command menu set with Telegram `setMyCommands` (ai, help).
- The worker answers Telegram at once and does the work in `ctx.waitUntil`, so slow pages don't cause retries. Logs: Cloudflare dashboard (observability is on). Webhook health: `getWebhookInfo`.

## Workers AI

- Binding `AI`, used through `WorkersAiClient` (`adapters/cloudflare`). Model `@cf/meta/llama-3.3-70b-instruct-fp8-fast` with `response_format: { type: 'json_schema', ... }` for tagging and topic picks. About 7–8 neurons a call; free tier is 10,000 neurons a day (resets 00:00 UTC). `/ai` on a long page is roughly 170.
- Models get retired: `@cf/meta/llama-3.1-8b-instruct` failed with `5028 ... deprecated on 2026-05-30`, silently (calls are wrapped in try/catch, so links saved without tags). If tags or topics stop appearing, check the model first.
- `llama-3.1-8b-instruct-fp8` works but rejects JSON schema (`5025`) and filed notes badly. Some models return `response` as a parsed object, not a string; `WorkersAiClient.complete` normalises it.
- To try a model or prompt, write a throwaway worker in the scratchpad with `"ai": { "binding": "AI" }` and run `npx --prefix <repo> wrangler dev --port 8799` (AI runs remotely, needs `wrangler login`), then `curl localhost:8799`.

## Notifications

`src/shared/lib/reminders.ts` fires a reminder at 20:00 from the open or installed app (checked each minute) while own tasks or habits are left; Settings only switches it on or off. True background push is planned in `TODO.md` (worker cron + VAPID); `src/app/sw.ts` already handles `push` and `notificationclick`.
