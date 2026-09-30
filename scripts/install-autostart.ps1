# Автозапуск Waqt при входе в Windows без установщика: скрытый запуск `node scripts\start.js`.
# Права администратора не нужны. Отключение: npm run autostart:off
$root = Split-Path -Parent $PSScriptRoot
$startup = [Environment]::GetFolderPath('Startup')
$vbs = Join-Path $startup 'Waqt.vbs'

$content = @"
' Waqt: start at Windows logon (created by scripts/install-autostart.ps1)
Set sh = CreateObject("WScript.Shell")
sh.CurrentDirectory = "$root"
sh.Run "cmd /c node scripts\start.js", 0, False
"@

Set-Content -Path $vbs -Value $content -Encoding Default
Write-Output "Автозапуск включён: $vbs"
