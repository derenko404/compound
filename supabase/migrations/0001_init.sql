-- Roadmap Log schema. Every table is private per user via Row Level Security.

create table public.settings (
  user_id    uuid primary key default auth.uid() references auth.users on delete cascade,
  start_date date,
  quit       jsonb,          -- { date, cpd, price }
  gym_start  date,
  updated_at timestamptz not null default now()
);

create table public.day_logs (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  day     date not null,
  done    text[] not null default '{}',
  log     text,
  weight  numeric(5, 1),
  smoke   text check (smoke in ('free', 'slip')),
  primary key (user_id, day)
);

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

create table public.chapter_notes (
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  chapter    text not null,
  body       text not null default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, chapter)
);

create table public.notes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  chapter    text not null,
  body       text not null,
  created_at timestamptz not null default now()
);

create table public.custom_tasks (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  title      text not null,
  chapter    text not null,
  repeat     text not null check (repeat in ('once', 'daily', 'weekly')),
  date       date,
  weekday    smallint check (weekday between 0 and 6),
  created_at timestamptz not null default now()
);

create table public.ideas (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  title      text not null,
  body       text not null default '',
  labels     text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table public.idea_notes (
  id         uuid primary key default gen_random_uuid(),
  idea_id    uuid not null references public.ideas on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  body       text not null,
  created_at timestamptz not null default now()
);

create table public.list_items (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  list    text not null check (list in ('books', 'films', 'songs', 'places')),
  idx     int not null,
  done_at timestamptz,
  note    text,
  primary key (user_id, list, idx)
);

create index on public.notes (user_id, created_at desc);
create index on public.ideas (user_id, created_at desc);
create index on public.idea_notes (idea_id);

-- Row Level Security: each user reads and writes only their own rows.
do $$
declare t text;
begin
  foreach t in array array[
    'settings', 'day_logs', 'plan_progress', 'project_status', 'chapter_notes',
    'notes', 'custom_tasks', 'ideas', 'idea_notes', 'list_items'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "own rows" on public.%I for all to authenticated
         using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
  end loop;
end $$;
