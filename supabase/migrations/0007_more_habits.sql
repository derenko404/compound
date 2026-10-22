-- Three more ready-made habit trackers, each an amount a day against a target (like water): sleep (hours),
-- meditation (minutes, the timer's sessions add to it) and reading (pages).

alter table public.habits drop constraint if exists habits_type_check;
alter table public.habits add constraint habits_type_check
  check (type in ('gym', 'water', 'sleep', 'meditation', 'reading', 'smoking', 'build', 'break'));
