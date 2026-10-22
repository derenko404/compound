-- Offline first: the app keeps changes made without a connection and sends them later. The latest edit of an
-- item wins, so every synced table records when its row was last changed. The app writes the time the change
-- was made on the device and skips a queued change when the row was changed later (on another device); the
-- worker (API, MCP, bot) writes now(). No trigger sets it: that would overwrite the device's time.

alter table public.day_logs       add column if not exists updated_at timestamptz not null default now();
alter table public.plan_progress  add column if not exists updated_at timestamptz not null default now();
alter table public.project_status add column if not exists updated_at timestamptz not null default now();
alter table public.notes          add column if not exists updated_at timestamptz not null default now();
alter table public.list_progress  add column if not exists updated_at timestamptz not null default now();
alter table public.habit_logs     add column if not exists updated_at timestamptz not null default now();
