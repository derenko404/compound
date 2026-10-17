# Roadmap Log

Personal PWA for an 18-month self-development roadmap: daily tasks, quarterly plan, chapter guides (resources, projects, checklists), ideas, notes, 100-item lists, health trackers. Live at https://roadmap.vasya-derenko.workers.dev.

## Commands

- `npm run dev` / `npm run build` (runs `tsc -b` first) / `npm run lint` (oxlint) / `npm run preview`
- No test suite. To verify UI, build, run `vite preview`, and drive headless Chrome over CDP (`--remote-debugging-port`, Node's global `WebSocket`). Puppeteer/Playwright are not installed.

## Stack

Vite 8 + React 19 + TypeScript 6, TanStack Router (code-based routes in `src/router.tsx`) and TanStack Query, shadcn/ui (new-york) on Tailwind v4, Supabase (Postgres + auth), vite-plugin-pwa (`injectManifest`, worker in `src/sw.ts`). Import alias `@/` → `src/`.

## Data flow

Everything the user changes is an `Op` (`src/lib/types.ts`):

1. `useStore().dispatch(op)` (`src/store/StoreProvider.tsx`) applies `reduce` (`src/store/reduce.ts`) to the cached Query state optimistically.
2. A mutation with `scope: { id: 'save' }` persists it via the active `Backend` (`src/store/backends.ts`), one at a time and in order.
3. Backends: `cloudBackend` (Supabase, one table per kind) when signed in; `localBackend` (one JSON blob in localStorage, key `roadmap-log-v2`) when the user picked device-only.

To add a new kind of data: add the `Op` variant and `State` field in `types.ts`, handle it in `reduce.ts`, in `cloudBackend.load`/`save` and `importLocal`, and add a migration in `supabase/migrations/` with RLS (see below).

`state.plan` (table `plan_progress`) also stores checklist and resource ticks under prefixed ids: `chk:<chapter>:<slug>:<i>` and `res:<chapter>:<slug>`. Count real plan tasks by filtering on `TASKS` ids, not `Object.keys(state.plan)`.

## Content

- `src/data/plan.ts`: chapters, quarters, plan tasks, projects, daily routine, health milestones. Task/project ids are stored in the DB, so don't rename them.
- `src/data/guides.ts`: the roadmap doc transcribed (chapter guides, `PROJECT_DETAILS`, `OVERVIEW`). Source doc: https://claude.ai/code/artifact/61482468-7024-4621-a941-2a770a3df94d (a Claude Docs doc; read it with the Claude Docs connector, not WebFetch).
- `src/data/lists.ts`: generated 100-item lists. List items are keyed by index, so append, don't reorder.
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

## Notifications

`src/fx/notify.ts` fires a daily reminder from the open or installed app (checked each minute). True background push would need a sender (e.g. a Cloudflare cron with VAPID keys); `src/sw.ts` already handles `push` and `notificationclick`.
