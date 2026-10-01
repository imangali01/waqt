# Push-уведомления на телефон (веб-версия)

Сервер (Supabase Edge Function `send-reminders`) раз в 30 секунд смотрит времена и отметки пользователя и шлёт web-push:
начало намаза и, пока намаз не отмечен, напоминания за 20/15/10/5/4/3/2/1,5/1/0,5 минуты до конца.
Звук стандартный системный (свой звук в web-push задать нельзя).

## Настройка (один раз)

1. Ключи VAPID: `npx web-push generate-vapid-keys`. Публичный ключ — в `site/config.js` (`VAPID_PUBLIC_KEY`), приватный — только в секреты.
2. SQL Editor: выполнить `supabase/schema.sql` (новые таблицы `push_subscriptions`, `push_sent`).
3. Секреты функции:
   `supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:you@example.com CRON_SECRET=<случайная строка> APP_URL=<адрес сайта>/app/`
4. Деплой: `npm run functions:build`, затем `supabase functions deploy send-reminders --no-verify-jwt`.
5. SQL Editor: выполнить `supabase/push-cron.sql`, подставив `CRON_SECRET`.
6. Задеплоить сайт на Vercel (`docs/deploy-vercel.md`). На iPhone: Safari → «На экран Домой» → открыть иконку → войти → нажать колокольчик.

Требования: iOS 16.4+ (только установленная на «Домой» веб-версия), Android — Chrome.
