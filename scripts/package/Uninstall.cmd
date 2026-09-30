@echo off
chcp 65001 >nul
setlocal
title Удаление Waqt

set "DST=%LOCALAPPDATA%\Programs\Waqt"
set "LNK=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Waqt.lnk"

echo Закрываю Waqt...
taskkill /IM Waqt.exe /F >nul 2>&1
ping -n 3 127.0.0.1 >nul

echo Удаляю программу и ярлык...
if exist "%DST%" rmdir /S /Q "%DST%"
if exist "%LNK%" del "%LNK%"

echo Отключаю автозапуск...
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v Waqt /f >nul 2>&1
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v waqt /f >nul 2>&1
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v electron.app.Waqt /f >nul 2>&1

echo.
echo Готово. Ваши отметки и история сохранены в "%APPDATA%\waqt" (можно удалить вручную).
ping -n 5 127.0.0.1 >nul
endlocal
