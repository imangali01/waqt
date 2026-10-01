# Деплой сайта на Vercel

Сайт (`site/`: лендинг + веб-версия виджета `site/app/`) задеплоен на Vercel: https://waqt-timer.vercel.app (веб-виджет: `/app/`).

## Как задеплоить

Из корня проекта:

```
VERCEL_TOKEN="$(cat ~/.vercel-token)" npx --yes vercel deploy --prod --yes
```

- Токен Vercel лежит в `~/.vercel-token` (`C:\Users\BMG\.vercel-token`), вне репозитория. В чат, память и файлы проекта его не копировать.
- Проект привязан (`.vercel/`), настройки сборки в `vercel.json` (`node scripts/build-site.js`, вывод `site/`).
- CLI заливает локальные файлы, коммит для деплоя не нужен; но деплоить стоит из актуального `main`.
- Прод-деплой Claude Code может блокироваться режимом разрешений: тогда команду запускает пользователь или добавляет Bash-правило в настройках.

## Заметки
- GitHub Pages (`.github/workflows/pages.yml`) не используется: в репозитории Pages не включён, workflow `pages` падает на `configure-pages`.
- Push-уведомления: сервер в Supabase, см. `docs/web-push.md`.
