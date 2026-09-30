@echo off
chcp 65001 >nul
setlocal
title Установка Waqt

set "SRC=%~dp0Waqt"
set "DST=%LOCALAPPDATA%\Programs\Waqt"
set "LNK=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Waqt.lnk"

if not exist "%SRC%\Waqt.exe" (
  echo Не найдена папка Waqt рядом с Install.cmd. Распакуйте архив целиком и запустите снова.
  pause
  exit /b 1
)

echo Закрываю запущенный Waqt...
taskkill /IM Waqt.exe /F >nul 2>&1
ping -n 3 127.0.0.1 >nul

echo Копирую приложение в "%DST%"...
if exist "%DST%" rmdir /S /Q "%DST%"
xcopy "%SRC%" "%DST%\" /E /I /Y /Q >nul
if errorlevel 1 (
  echo Не удалось скопировать файлы.
  pause
  exit /b 1
)

rem Снимаем пометку «файл из интернета», если архив был скачан.
powershell -NoProfile -Command "Get-ChildItem -Recurse -LiteralPath '%DST%' | Unblock-File" >nul 2>&1

echo Создаю ярлык в меню Пуск...
set "VBS=%TEMP%\waqt-shortcut.vbs"
> "%VBS%" echo Set s = CreateObject("WScript.Shell")
>> "%VBS%" echo Set l = s.CreateShortcut("%LNK%")
>> "%VBS%" echo l.TargetPath = "%DST%\Waqt.exe"
>> "%VBS%" echo l.WorkingDirectory = "%DST%"
>> "%VBS%" echo l.Save
cscript //nologo "%VBS%" >nul 2>&1
del "%VBS%" >nul 2>&1

echo Запускаю Waqt...
start "" "%DST%\Waqt.exe"

echo.
echo Готово. Waqt установлен и будет запускаться вместе с Windows.
echo Удалить: Uninstall.cmd
ping -n 5 127.0.0.1 >nul
endlocal
