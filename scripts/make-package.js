// Собирает dist/Waqt-<версия>-win.zip: готовое приложение + Install.cmd / Uninstall.cmd.
// Запуск: npm run pack:win
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const { version } = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const dist = path.join(root, 'dist');
// Сборка в отдельную папку: dist/win-unpacked может быть занята запущенным приложением.
const build = path.join(dist, 'pack-build');
const staging = path.join(dist, 'package');
const zip = path.join(dist, `Waqt-${version}-win.zip`);

function run(cmd, args) {
  const r = spawnSync(cmd, args, { cwd: root, stdio: 'inherit', shell: true });
  if (r.status !== 0) throw new Error(`${cmd} завершился с кодом ${r.status}`);
}

// 1. Сборка приложения без установщика (папка dist/pack-build/win-unpacked).
fs.rmSync(build, { recursive: true, force: true });
run('npx', ['electron-builder', '--win', 'dir', '--publish', 'never', `--config.directories.output="${build}"`]);

// 2. Пакет: Waqt/ + скрипты установки.
fs.rmSync(staging, { recursive: true, force: true });
fs.mkdirSync(staging, { recursive: true });
fs.cpSync(path.join(build, 'win-unpacked'), path.join(staging, 'Waqt'), { recursive: true });
for (const f of ['Install.cmd', 'Uninstall.cmd', 'README.txt']) {
  fs.copyFileSync(path.join(root, 'scripts', 'package', f), path.join(staging, f));
}

// 3. Архив.
fs.rmSync(zip, { force: true });
run('powershell', ['-NoProfile', '-Command', `"Compress-Archive -Path '${staging}\\*' -DestinationPath '${zip}'"`]);
console.log(`Готово: ${zip}`);
