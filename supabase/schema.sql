-- Схема для облачного хранения прогресса пользователей.
-- Выполните этот SQL в Supabase: Dashboard → SQL Editor → New query → Run.

-- Таблица прогресса: одна строка на пользователя, прогресс в jsonb.
create table if not exists public.user_progress (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Row Level Security: каждый видит и меняет только свою строку.
alter table public.user_progress enable row level security;

drop policy if exists "own progress: select" on public.user_progress;
create policy "own progress: select"
  on public.user_progress for select
  using (auth.uid() = user_id);

drop policy if exists "own progress: insert" on public.user_progress;
create policy "own progress: insert"
  on public.user_progress for insert
  with check (auth.uid() = user_id);

drop policy if exists "own progress: update" on public.user_progress;
create policy "own progress: update"
  on public.user_progress for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
