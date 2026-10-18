-- AI access: personal access tokens for the API (/api/v1) and the MCP server (/mcp).
-- The app makes the token, shows it once and stores only its SHA-256 hash. The worker (secret key, bypasses RLS)
-- looks a request's token up by hash and acts as that user. A token has full access to its owner's data.

create table public.api_tokens (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users on delete cascade,
  name         text not null,
  token_hash   text not null unique,
  prefix       text not null,            -- the first characters, so the user can tell tokens apart
  created_at   timestamptz not null default now(),
  last_used_at timestamptz
);

alter table public.api_tokens enable row level security;
create policy "own rows" on public.api_tokens for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Notes an AI adds through the API are marked as such.
alter table public.notes drop constraint notes_source_check;
alter table public.notes add constraint notes_source_check check (source in ('app', 'telegram', 'api'));
