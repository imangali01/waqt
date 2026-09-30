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
  synced_at timestamptz not null default now(),
  primary key (user_id, date, prayer)
);

-- Для баз, где таблица уже была создана прежней версией схемы.
alter table public.prayer_marks add column if not exists synced_at timestamptz not null default now();

create index if not exists prayer_marks_user_synced on public.prayer_marks (user_id, synced_at);

-- Серверный курсор синхронизации и last-write-wins на стороне сервера:
-- synced_at ставится часами сервера, а более старая версия не затирает новую.
create or replace function public.prayer_marks_guard() returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and new.updated_at < old.updated_at then
    return null;
  end if;
  new.synced_at := now();
  return new;
end $$;

drop trigger if exists prayer_marks_guard on public.prayer_marks;
create trigger prayer_marks_guard before insert or update on public.prayer_marks
  for each row execute function public.prayer_marks_guard();

alter table public.prayer_days enable row level security;
alter table public.prayer_marks enable row level security;

drop policy if exists "own days" on public.prayer_days;
create policy "own days" on public.prayer_days
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "own marks" on public.prayer_marks;
create policy "own marks" on public.prayer_marks
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Живая синхронизация между устройствами (Supabase Realtime).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'prayer_marks'
  ) then
    alter publication supabase_realtime add table public.prayer_marks;
  end if;
end $$;

-- Push-уведомления на телефон (веб-версия). Подписку создаёт сам браузер пользователя.
create table if not exists public.push_subscriptions (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  lang text not null default 'ru',
  created_at timestamptz not null default now(),
  primary key (user_id, endpoint)
);

-- Журнал отправленных push (защита от дублей). Пишет только Edge Function, клиентам недоступен.
create table if not exists public.push_sent (
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, key)
);

alter table public.push_subscriptions enable row level security;
alter table public.push_sent enable row level security;

drop policy if exists "own push" on public.push_subscriptions;
create policy "own push" on public.push_subscriptions
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
