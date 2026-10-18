-- Roadmap Log: the whole schema for a fresh database. Run once in the Supabase SQL Editor.
--
-- Every table is private per user: user_id defaults to auth.uid() and an "own rows" policy (at the end)
-- limits reads and writes to it. The Telegram worker uses the secret key, which bypasses RLS, and sets
-- user_id itself. Editable content (tracks, lists, routines) is kept as JSON in `data`; the app shapes it
-- (src/lib/types.ts) and fills defaults on load.

/* ---------- Settings and days ---------- */

-- One row per user. program: { seeded, focus } (seed version applied, the focus track).
create table public.settings (
  user_id    uuid primary key default auth.uid() references auth.users on delete cascade,
  program    jsonb,
  updated_at timestamptz not null default now()
);

-- One row per day: routine and track ticks, and the mood picked on Wellbeing.
create table public.day_logs (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  day     date not null,
  done    text[] not null default '{}',
  mood    smallint check (mood between 1 and 5), -- 1 awful … 5 great
  primary key (user_id, day)
);

/* ---------- Tracks ---------- */

-- Tracks (UI) are chapters (code): skills with topics, resources, projects. Content in `data`.
create table public.chapters (
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  id         text not null,
  data       jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- Ticked topics and resources: item id → when.
create table public.plan_progress (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  task_id text not null,
  done_at timestamptz not null default now(),
  primary key (user_id, task_id)
);

create table public.project_status (
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  project_id text not null,
  status     text not null check (status in ('todo', 'doing', 'done')),
  primary key (user_id, project_id)
);

/* ---------- Today ---------- */

-- Routines and one-off tasks. Content in `data` (title, when, track, streak flag).
create table public.routines (
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  id         text not null,
  data       jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

/* ---------- Notebook ---------- */

-- Notes, ideas and links in one table. The app reads them a page at a time; filters run here.
create table public.notes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  type       text not null default 'note' check (type in ('note', 'idea', 'link')),
  body       text not null default '',
  url        text,                                      -- links only; one per user (the bot upserts on it)
  kind       text check (kind in ('video', 'post', 'site')),
  context    text not null default '',                  -- written by the bot's AI; read-only in the app
  tags       text[] not null default '{}',
  chapter    text,                                      -- a track id; null = not filed
  source     text not null default 'app' check (source in ('app', 'telegram')),
  created_at timestamptz not null default now(),
  unique (user_id, url)
);

create index notes_user_created on public.notes (user_id, created_at desc);
create index notes_tags on public.notes using gin (tags);

/* ---------- Lists ---------- */

-- 100-item lists. Content in `data` (name, title, detail label, items).
create table public.lists (
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  id         text not null,
  data       jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- Ticks and notes on list items.
create table public.list_progress (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  list_id text not null,
  item_id text not null,
  done_at timestamptz,
  note    text,
  primary key (user_id, list_id, item_id)
);

/* ---------- Wellbeing ---------- */

-- Habits: every type shares these columns; what one type needs goes into custom_data
-- (smoking: per_day, price; water and new habit: target).
create table public.habits (
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  id          text not null,
  type        text not null check (type in ('gym', 'water', 'smoking', 'build', 'break')),
  name        text not null,
  why         text,
  start_date  date,                              -- quit day, day 1, first gym week; null = not started
  days        smallint[] not null default '{}',  -- weekdays it's due, 0 = Sunday; empty = every day
  position    integer not null default 0,
  custom_data jsonb not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (user_id, id)
);

-- One number per habit per day: 1 = done or a clean day, -1 = a slip, a count for water.
create table public.habit_logs (
  user_id  uuid not null default auth.uid() references auth.users on delete cascade,
  habit_id text not null,
  day      date not null,
  value    real not null,
  primary key (user_id, habit_id, day),
  foreign key (user_id, habit_id) references public.habits (user_id, id) on delete cascade
);

/* ---------- Telegram ---------- */

-- Settings → Connect Telegram: the app makes a one-time code, the bot gets it from t.me/<bot>?start=<code>
-- and links the chat to the account. One chat per account, one account per chat.
create table public.telegram_links (
  user_id    uuid primary key default auth.uid() references auth.users on delete cascade,
  chat_id    bigint not null unique,
  username   text,
  created_at timestamptz not null default now()
);

create table public.telegram_codes (
  code       text primary key,
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now()
);

/* ---------- Row Level Security ---------- */

-- The SQL Editor warns "without RLS" because the policies are made in a loop; "Run and enable RLS" is fine.
do $$
declare t text;
begin
  foreach t in array array[
    'settings', 'day_logs', 'chapters', 'plan_progress', 'project_status', 'routines', 'notes',
    'lists', 'list_progress', 'habits', 'habit_logs', 'telegram_links', 'telegram_codes'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "own rows" on public.%I for all to authenticated
         using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
  end loop;
end $$;
