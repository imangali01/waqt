// Готовит site/ к публикации: копирует общий код приложения в веб-версию и рисует иконки.
// Запуск: node scripts/build-site.js  (то же делает GitHub Actions перед публикацией на Pages)
import fs from 'node:fs';
import path from 'node:path';
import { moonPng } from './png.js';

const root = path.resolve(import.meta.dirname, '..');
const site = path.join(root, 'site');
const app = path.join(site, 'app');

function copy(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

// Общая логика (чистые модули без Electron).
for (const f of fs.readdirSync(path.join(root, 'src/core'))) {
  copy(path.join(root, 'src/core', f), path.join(app, 'src/core', f));
}
copy(path.join(root, 'src/web/api.js'), path.join(app, 'src/web/api.js'));
copy(path.join(root, 'src/renderer/i18n-dom.js'), path.join(app, 'src/renderer/i18n-dom.js'));
for (const f of ['widget.js', 'widget.css']) {
  copy(path.join(root, 'src/renderer/widget', f), path.join(app, 'src/renderer/widget', f));
}
copy(path.join(root, 'assets/names.json'), path.join(app, 'names.json'));
copy(path.join(root, 'assets/chime.wav'), path.join(app, 'chime.wav'));

// Иконки: у iOS нет прозрачности, поэтому подложка белая.
const WHITE = [255, 255, 255];
const icons = path.join(app, 'icons');
fs.mkdirSync(icons, { recursive: true });
fs.writeFileSync(path.join(icons, 'apple-touch-icon.png'), moonPng(180, WHITE));
fs.writeFileSync(path.join(icons, 'icon-192.png'), moonPng(192, WHITE));
fs.writeFileSync(path.join(icons, 'icon-512.png'), moonPng(512, WHITE));
fs.mkdirSync(path.join(site, 'assets'), { recursive: true });
fs.writeFileSync(path.join(site, 'assets/logo-64.png'), moonPng(64));
console.log('site готов');
