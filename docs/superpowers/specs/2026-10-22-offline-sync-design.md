# Offline first: work without internet, sync later

## Why

The owner was in a store with no connection and wanted to make a grocery list. Signed in, Compound loads
everything from Supabase on open and saves each change straight to it, so with no network the app showed an
error instead of the data, and a failed save toasted "Couldn't save" and reloaded, throwing the change away.

Compound should feel like a native app: open it anywhere, change anything, and the changes reach the account
when the connection comes back, without the user doing anything.

## Goals

- The installed app (and the browser tab) opens with no connection and shows the last known data on every
  view: My day, Topics, Lists, Notebook, Wellbeing, Timer, Settings.
- Every change made offline (ticks, new lists and items, tasks, topics, habits, mood, notes) is applied on
  the device at once, looks the same as online, and survives closing and reopening the app.
- When a connection is back (app open, or the next time it opens online), queued changes go to Supabase in
  the order they were made, then the app refreshes from the server.
- Conflicts: **the latest edit wins**, per item (a list, topic, routine, habit, note, one day's log, one tick).
  Each change carries the time it was made on the device. A queued change is dropped if the server copy of
  that item was changed later (for example on the laptop while the phone was offline). Dropped silently, no
  prompt (owner agreed to "latest wins"; silence is my call).
- The top bar's cloud icon tells the truth: offline with N changes waiting, syncing, synced. No error toasts
  for being offline.

## Non-goals

- Merging two edits to the same item field by field. A list is one item: the later edit of the whole list wins.
- Offline for things that only exist on the network: signing in, the Telegram bot, AI access tokens, share
  links (creating or opening), Telegram connect, backup import, push setup. These say they need a connection
  (one shared "You're offline" message) instead of failing with a generic error.
- Device-only mode: it already works offline and does not change.
- Real-time updates from other devices while online (the existing 30 s staleness refresh stays).

## Anti-goals (would be a failure even if it works)

- Losing a change the user made. A change is only dropped by the latest-wins rule, never by a failed request,
  a reload, an app update or the phone killing the app.
- An offline change silently overwriting a newer edit made on another device.
- The app getting stuck: a queued change the server rejects for good (say a constraint error) must not block
  everything behind it forever.
- Breaking the API/MCP or the bot, which write to the same tables from the worker.

## Constraints

- Follow CLAUDE.md: layers (core / adapters / shared / features / pages / app), services as classes with ports,
  i18n for every string, design tokens, comment style, `npm run lint` and `npm run build` pass.
- Data flow stays op-based: `dispatch(op)` → `reduce` → persist. The queue holds `Op`s, not diffs.
- Supabase migrations are run by hand by the owner **before** code that reads the new columns is pushed.
  The next migration is `0006_...sql`.
- The PWA update flow (`skipWaiting`, auto reload) must not lose queued changes: the queue lives in durable
  storage, not memory.
- iOS standalone PWA: background sync APIs are not available, so syncing runs when the app is open
  (on start, on `online`, on return to the foreground, and after each dispatch).
- New dependencies only with `npm i -E` and a version out for two weeks.

## Decided

- **Latest wins by edit time.** Every synced table gets an `updated_at timestamptz` column if it lacks one
  (today missing on `day_logs`, `plan_progress`, `project_status`, `notes`, `list_progress`, `habit_logs`).
  The app writes `updated_at` = the time the op was made on the device, not the time it reaches the server.
  The worker (API, MCP, bot) writes `now()`. A queued write is applied only if the server row is missing or
  its `updated_at` is older than the op's time.
- **Deletes:** a delete is applied if the row's `updated_at` is not newer than the delete. An offline edit to
  something deleted elsewhere brings it back (no tombstones). My call: rare for one person, and losing a
  delete is better than losing an edit.
- **Order:** queued ops are sent one at a time, oldest first, as today's `scope: 'save'` mutation does.
- **Local copy:** the last loaded `State` and the queue are kept on the device per account (key includes the
  user id) so signing out or switching accounts never mixes data. Sign out with unsynced changes asks first
  (ConfirmSheet: "N changes haven't synced yet. Sign out anyway?").
- **Opening:** the app renders from the local copy at once, then loads from the server in the background when
  online. While the queue is not empty, the server load is applied with the queued ops replayed on top
  (`reduce`), so pending changes never flicker away.
- **Notebook:** recently loaded note pages and counts are kept on the device too, so the Notebook opens
  offline. A note written offline shows at the top of the matching list at once. Filtering/search over notes
  offline only covers what is on the device (my call).
- **Seed:** `useSeed` must not run while offline on a never-loaded account (it would re-create starting
  content over real data once synced).

- **Every write path sets `updated_at`.** Today only `settings` writes it; upserts to `topics`, `lists`,
  `routines`, `habits` leave the insert time. App writes set the op's device time, worker writes `now()`. No
  database trigger that sets `now()` on update (it would overwrite the device time).
- **Queued ops carry their own payload.** The `settings` op is saved today from `next.settings.program`; a
  queued one must store the program it set, or a replay writes the wrong thing.
- **Batches (reorders) are checked item by item.** A dropped item keeps its server position; duplicate or odd
  positions are fine because sorting is stable (my call, a drag fixes it).
- **Known, accepted:** unticking a step or clearing a habit log deletes the row, so an older offline tick can
  come back after a later untick elsewhere (same as the delete rule).
- **Rejected for good:** a link note queued offline that the bot already saved (`23505` on `(user_id, url)`)
  is dropped with the existing "link already saved" toast. Other permanent rejections: drop and one error
  toast (my call).
- **Sign out** after the unsynced-changes prompt wipes that account's local copy and queue (keeps one
  account's data off a shared device).

## Left to the builder

- Storage: localStorage vs IndexedDB for the local copy and queue, and whether to use TanStack Query's
  persister or a small own store. Mind the localStorage size limit with a large Notebook.
- How the conditional write runs: a Postgres function per table, one generic `upsert_if_newer`, or a read then
  write from the client (one user, so the race is tiny).
- Where the queue lives in the layers (likely a `SyncService` in `core/services` over a `QueuePort`, with a
  local adapter), and how `Backend` exposes it.
- How "offline" is detected (`navigator.onLine` plus treating fetch network errors as offline) and retry
  back-off for real server errors; what happens to an op the server rejects for good (drop it and show one
  error toast with what was lost, or park it).
- The exact cloud icon states and wording (en + uk) and the "You're offline" message for network-only actions.
- Making sure the service worker precache covers everything needed to boot offline (it already precaches the
  build; check fonts, icons and lazy chunks such as the tour).
- Updating CLAUDE.md (Data flow, Supabase, PWA sections) once the owner says the feature is ready.

## Done when

- Airplane mode on a phone with the installed app: open it, add a list with items, tick a task, log mood,
  write a note, close it, reopen it (still there), turn the network on: everything appears on the laptop.
- Edit a list on the laptop after the phone's offline edit of the same list: the laptop's version stays.
- No error toasts while offline; the icon shows changes waiting.
