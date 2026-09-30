# Отключает автозапуск Waqt (удаляет Waqt.vbs из папки автозагрузки).
$vbs = Join-Path ([Environment]::GetFolderPath('Startup')) 'Waqt.vbs'
if (Test-Path $vbs) {
  Remove-Item -LiteralPath $vbs -Force
  Write-Output "Автозапуск выключен: $vbs удалён"
} else {
  Write-Output 'Автозапуск не был включён'
}
