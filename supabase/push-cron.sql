-- Расписание push-напоминаний: Edge Function send-reminders вызывается каждые 30 секунд.
-- Выполнить один раз в Dashboard → SQL Editor. Вместо <CRON_SECRET> подставить тот же секрет,
-- что задан в секретах функции (supabase secrets set CRON_SECRET=...). В репозиторий секрет не писать.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'waqt-send-reminders',
  '30 seconds',
  $$
  select net.http_post(
    url := 'https://xzmezgwdwqrfgbhxgdsu.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object('x-cron-secret', '<CRON_SECRET>')
  );
  $$
);

-- Остановить: select cron.unschedule('waqt-send-reminders');
