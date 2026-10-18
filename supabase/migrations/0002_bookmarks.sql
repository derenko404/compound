-- Finds: links saved from the app or sent to the Telegram bot.
-- The bot writes with the service key and sets user_id itself; the app reads and writes through RLS.

create table public.bookmarks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  url         text not null,
  kind        text not null check (kind in ('video', 'post', 'site')),
  title       text not null default '',
  description text not null default '',
  tags        text[] not null default '{}',
  note        text not null default '',
  source      text not null default 'app' check (source in ('app', 'telegram')),
  created_at  timestamptz not null default now(),
  unique (user_id, url)
);

create index on public.bookmarks (user_id, created_at desc);

alter table public.bookmarks enable row level security;
create policy "own rows" on public.bookmarks for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
