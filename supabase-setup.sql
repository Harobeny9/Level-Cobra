create table if not exists public.snake_scores (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) between 1 and 12),
  score integer not null check (score >= 0),
  mode text not null default 'none' check (mode in ('none', 'shared', 'split')),
  speed text not null default 'normal' check (speed in ('slow', 'normal', 'fast', 'insane')),
  updated_at timestamptz not null default now()
);

alter table public.snake_scores add column if not exists mode text not null default 'none';
alter table public.snake_scores add column if not exists speed text not null default 'normal';

alter table public.snake_scores
  drop constraint if exists snake_scores_name_key;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'snake_scores_mode_check'
  ) then
    alter table public.snake_scores
      add constraint snake_scores_mode_check
      check (mode in ('none', 'shared', 'split'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'snake_scores_speed_check'
  ) then
    alter table public.snake_scores
      add constraint snake_scores_speed_check
      check (speed in ('slow', 'normal', 'fast', 'insane'));
  end if;
end $$;

create unique index if not exists snake_scores_name_mode_speed_idx
  on public.snake_scores (name, mode, speed);

alter table public.snake_scores enable row level security;

drop policy if exists "snake_scores_read_all" on public.snake_scores;
create policy "snake_scores_read_all"
on public.snake_scores
for select
to anon
using (true);

drop policy if exists "snake_scores_insert_all" on public.snake_scores;
create policy "snake_scores_insert_all"
on public.snake_scores
for insert
to anon
with check (true);

drop policy if exists "snake_scores_update_all" on public.snake_scores;
create policy "snake_scores_update_all"
on public.snake_scores
for update
to anon
using (true)
with check (true);
