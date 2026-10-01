import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import { createJsonFile } from './json-file.js';
import { createSync } from '../core/sync.js';
import { subscribeMarks } from '../core/realtime.js';
import { supabaseConfig, hasStoredSession } from '../core/supabase-config.js';

// Синхронизация отметок с Supabase: сессия в auth.json, периодический syncOnce и Realtime.
// Без настроек Supabase возвращает null — приложение работает локально.
export function createSupabaseSync({ userData, appPath, env, store, onResult }) {
  const authFile = createJsonFile(path.join(userData, 'auth.json'));
  const authStorage = {
    getItem: (k) => authFile.read({})[k] ?? null,
    setItem: (k, v) => authFile.write({ ...authFile.read({}), [k]: v }),
    removeItem: (k) => { const o = authFile.read({}); delete o[k]; authFile.write(o); },
  };
  const cfg = supabaseConfig(env, createJsonFile(path.join(appPath, 'supabase.config.json')).read(null));
  if (!cfg) return null;

  const client = createClient(cfg.url, cfg.key, {
    auth: { storage: authStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    realtime: { transport: WebSocket },
  });
  const sync = createSync({ client, data: store.data, save: store.save });
  let syncTimer;

  async function runSync() {
    try {
      onResult(await sync.syncOnce());
    } catch (e) {
      onResult({ ok: false, reason: String(e.message ?? e) });
    }
  }

  function scheduleSync() {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(runSync, 500);
  }

  // Изменения с другого устройства (сайт, второй компьютер) приходят сразу через Supabase Realtime.
  let stopRealtime = null;
  async function ensureRealtime() {
    if (stopRealtime) return;
    const { data } = await client.auth.getSession();
    const user = data?.session?.user;
    if (!user) return;
    stopRealtime = subscribeMarks({ client, userId: user.id, onChange: runSync });
  }
  client.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') { stopRealtime?.(); stopRealtime = null; } else ensureRealtime();
  });

  // error — текст ошибки Supabase или null.
  async function login(email, password) {
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) return error.message;
    runSync();
    ensureRealtime();
    return null;
  }

  function start() {
    runSync();
    ensureRealtime();
    setInterval(runSync, 60e3); // страховка, если Realtime не дошёл
  }

  return { runSync, scheduleSync, login, start, hasSession: () => hasStoredSession(authFile.read({})) };
}
