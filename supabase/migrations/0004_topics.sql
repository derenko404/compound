-- Tracks are now topics, and the topics inside a skill are steps.
-- Renames the table and the note column, and rewrites the JSON that names them: a topic's skills,
-- a routine's topic, and shared snapshots (kind and skills).

-- Skills keep their order: topics → steps inside each one.
create or replace function pg_temp.skills_to_steps(d jsonb) returns jsonb language sql as $$
  select case when jsonb_typeof(d->'skills') = 'array' then jsonb_set(d, '{skills}', coalesce((
    select jsonb_agg((k - 'topics') || jsonb_build_object('steps', coalesce(k->'topics', '[]'::jsonb)) order by i)
    from jsonb_array_elements(d->'skills') with ordinality as s(k, i)
  ), '[]'::jsonb)) else d end
$$;

alter table public.chapters rename to topics;
update public.topics set data = pg_temp.skills_to_steps(data);

alter table public.notes rename column chapter to topic;

update public.routines set data = (data - 'chapter') || jsonb_build_object('topic', data->'chapter')
where data ? 'chapter';

alter table public.shares drop constraint if exists shares_kind_check;
update public.shares set kind = 'topic', data = pg_temp.skills_to_steps(data) where kind = 'track';
alter table public.shares add constraint shares_kind_check check (kind in ('topic', 'list'));
