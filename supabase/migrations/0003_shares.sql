-- Share by link: a snapshot of a track's or a list's content (never ticks, notes or progress) under a random id.
-- A link works for 7 days: get_share() stops serving it, and a daily cron in the worker deletes it.
-- Only the owner sees their shares in the table. Anyone with a link reads that one share through get_share(),
-- so shares can't be listed or guessed in bulk.

create table public.shares (
  id         text primary key,                      -- random, in the link: /share/<id>
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  kind       text not null check (kind in ('track', 'list')),
  name       text not null,
  data       jsonb not null,
  created_at timestamptz not null default now()
);

create index shares_user_created on public.shares (user_id, created_at desc);

alter table public.shares enable row level security;
create policy "own rows" on public.shares for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- One share by its id, for anyone with the link (signed in or not), for 7 days after it was made.
-- mine: the visitor shared it themselves.
create or replace function public.get_share(share_id text)
returns table (kind text, name text, data jsonb, created_at timestamptz, mine boolean)
language sql stable security definer set search_path = ''
as $$ select s.kind, s.name, s.data, s.created_at, s.user_id = (select auth.uid()) from public.shares s
   where s.id = share_id and s.created_at > now() - interval '7 days' $$;

grant execute on function public.get_share(text) to anon, authenticated;
