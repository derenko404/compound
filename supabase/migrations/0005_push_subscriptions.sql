-- Daily push reminders: one row per device that switched them on (Settings → Notifications).
-- The app saves its own device; the worker's hourly cron (secret key, bypasses RLS) reads them all and sends,
-- in each device's time zone and language, a "Start your day" at morning_hour (null = off) and evening reminders
-- from evening_hour every 2 hours until 22:00, while the user's own tasks and habits are left.

create table public.push_subscriptions (
  endpoint     text primary key,
  user_id      uuid not null default auth.uid() references auth.users on delete cascade,
  p256dh       text not null,
  auth         text not null,
  time_zone    text not null default 'UTC',
  lang         text not null default 'en' check (lang in ('en', 'uk')),
  morning_hour smallint default 8 check (morning_hour between 0 and 23),
  evening_hour smallint not null default 20 check (evening_hour between 0 and 23),
  created_at   timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;
create policy "own rows" on public.push_subscriptions for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
