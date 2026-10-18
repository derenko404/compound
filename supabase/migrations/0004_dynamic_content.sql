-- Editable content: chapters, lists and routines move from the app's code into the database.
-- Each row keeps its content as JSON in `data`; the app seeds them on first load after this migration.

create table public.chapters (
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  id         text not null,
  data       jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table public.lists (
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  id         text not null,
  data       jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- Ticks and notes on list items, keyed by item id (the seeded items keep their old index as id).
create table public.list_progress (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  list_id text not null,
  item_id text not null,
  done_at timestamptz,
  note    text,
  primary key (user_id, list_id, item_id)
);

create table public.routines (
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  id         text not null,
  data       jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- Program shape (length, quarter focus, intro), edited on the Plan page.
alter table public.settings add column program jsonb;

-- Carry over existing progress.
insert into public.list_progress (user_id, list_id, item_id, done_at, note)
  select user_id, list, idx::text, done_at, note from public.list_items
  on conflict do nothing;

insert into public.routines (user_id, id, data)
  select user_id, id::text, jsonb_build_object(
    'id', id::text,
    'position', 1000,
    'title', title,
    'chapter', chapter,
    'created_at', created_at,
    'when', case repeat
      when 'daily' then jsonb_build_object('kind', 'daily')
      when 'weekly' then jsonb_build_object('kind', 'weekly', 'days', jsonb_build_array(weekday))
      else jsonb_build_object('kind', 'once', 'date', date)
    end)
  from public.custom_tasks
  on conflict do nothing;

do $$
declare t text;
begin
  foreach t in array array['chapters', 'lists', 'list_progress', 'routines'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "own rows" on public.%I for all to authenticated
         using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
  end loop;
end $$;
