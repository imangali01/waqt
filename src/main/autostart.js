// Автозапуск нужно (пере)зарегистрировать, если приложение установлено и запущено из нового места.
export const needsAutostart = ({ packaged, settings, exePath }) =>
  packaged && settings.autostartPath !== exePath;
