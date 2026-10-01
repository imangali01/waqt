// Копирует общую логику (src/core) в Edge Function, чтобы её деплой был самодостаточным.
// Запуск: npm run functions:build, затем: supabase functions deploy send-reminders --no-verify-jwt
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const from = path.join(root, 'src/core');
const to = path.join(root, 'supabase/functions/send-reminders/core');
fs.rmSync(to, { recursive: true, force: true });
fs.mkdirSync(to, { recursive: true });
for (const f of fs.readdirSync(from)) fs.copyFileSync(path.join(from, f), path.join(to, f));
console.log('функция готова:', to);
