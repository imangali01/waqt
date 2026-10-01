# Бесплатная подпись кода (SignPath Foundation)

Без подписи Windows 11 блокирует `Waqt.exe` (Smart App Control, «Интеллектуальное управление приложениями»). SignPath Foundation бесплатно подписывает открытые проекты; сертификат выдан фонду, подписывает сервис SignPath, а ключ не покидает их хранилище.

Статус: **подготовлено, заявка не подана**. Workflow `.github/workflows/sign-windows.yml` не проверен на реальной подписи и пропускается, пока не задана переменная `SIGNPATH_ORGANIZATION_ID`.

## Что сделано в репозитории
- Лицензия MIT (`LICENSE`), азан отдельно под CC BY-SA 4.0 (`assets/AZAN-LICENSE.md`).
- В `README.md` раздел «Политика подписи кода и конфиденциальность»: роли и что приложение отправляет в сеть. Заявке нужна ссылка на такую страницу.
- Сборка подписываемого установщика: `.github/workflows/sign-windows.yml`. Подписываются два файла: `Waqt.exe` до упаковки (его проверяет Windows при запуске) и готовый `Waqt-Setup.exe`.

## Что нужно сделать вам (я не могу: нужны ваши аккаунты)
1. Подать заявку на https://signpath.org (раздел про бесплатную подпись для open source). Указать: репозиторий `https://github.com/imangali01/waqt`, лицензия MIT, ссылка на раздел политики в README. Одобрение занимает время; требования могут измениться, читайте актуальные на сайте.
2. После одобрения в SignPath создать проект и два артефакта (конфигурация `Waqt.exe` и `Waqt-Setup.exe`) и политику подписи с идентификатором `release-signing` (если назовёте иначе, поправьте `signing-policy-slug` в workflow). Если SignPath потребует конфигурацию артефакта по имени, добавьте `artifact-configuration-slug` в оба шага подписи.
3. В репозитории на GitHub: Settings → Secrets and variables → Actions:
   - Variables: `SIGNPATH_ORGANIZATION_ID`, `SIGNPATH_PROJECT_SLUG`;
   - Secrets: `SIGNPATH_API_TOKEN`, а также `SUPABASE_URL` и `SUPABASE_PUBLISHABLE_KEY` (уже есть для `build.yml`).
4. Запустить workflow `sign-windows` вручную (Actions → Run workflow) или поставить тег `vX.Y.Z`. Готовый файл — в артефакте `Waqt-Setup-signed`. Положите его в GitHub Release как `Waqt-Setup.exe`.

## Ожидания
- Подпись фонда не даёт мгновенного «зелёного света» от SAC: репутация накапливается со временем и числом скачиваний. Но подписанное приложение из доверенной цепочки блокируется значительно реже, чем неподписанное.
- Пока подписи нет, остаётся пакет `npm run pack:win` (zip + `Install.cmd`), см. `.claude/CLAUDE.md`.
