-- Waqt: схема для Supabase. Выполнить в Dashboard → SQL Editor → Run.

create table if not exists public.prayer_days (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date date not null,
  times jsonb not null,
  primary key (user_id, date)
);

create table if not exists public.prayer_marks (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date date not null,
  prayer text not null check (prayer in ('fajr','dhuhr','asr','maghrib','isha')),
  status text not null check (status in ('on_time','late')),
  marked_at timestamptz not null,
  updated_at timestamptz not null,
  deleted boolean not null default false,
  primary key (user_id, date, prayer)
);

create index if not exists prayer_marks_user_updated on public.prayer_marks (user_id, updated_at);

alter table public.prayer_days enable row level security;
alter table public.prayer_marks enable row level security;

drop policy if exists "own days" on public.prayer_days;
create policy "own days" on public.prayer_days
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own marks" on public.prayer_marks;
create policy "own marks" on public.prayer_marks
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
