create table if not exists public.snake_scores (
  id bigint generated always as identity primary key,
  name text not null unique check (char_length(name) between 1 and 12),
  score integer not null check (score >= 0),
  updated_at timestamptz not null default now()
);

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
