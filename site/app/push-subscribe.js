import { shouldSyncPush } from './src/core/push-sync.js';

// Подписка браузера на web-push. Подписка хранится в Supabase (push_subscriptions), рассылку делает Edge Function.
const toKey = (b64) => {
  const s = (b64 + '='.repeat((4 - b64.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
};
const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));

export const pushSupported = () =>
  'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

const OPT_OUT_KEY = 'waqt.push.off';
const optedOut = () => { try { return localStorage.getItem(OPT_OUT_KEY) === '1'; } catch { return false; } };
const setOptedOut = (v) => { try { v ? localStorage.setItem(OPT_OUT_KEY, '1') : localStorage.removeItem(OPT_OUT_KEY); } catch { /* ignore */ } };

async function current() {
  const reg = await navigator.serviceWorker.ready;
  return { reg, sub: await reg.pushManager.getSubscription() };
}

export async function pushState() {
  if (!pushSupported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  const { sub } = await current();
  return sub && Notification.permission === 'granted' ? 'on' : 'off';
}

function row(sub, lang) {
  const j = sub.toJSON();
  return { endpoint: sub.endpoint, p256dh: j.keys?.p256dh ?? b64(sub.getKey('p256dh')), auth: j.keys?.auth ?? b64(sub.getKey('auth')), lang };
}

export async function enablePush({ client, vapidKey, lang }) {
  if (await Notification.requestPermission() !== 'granted') return 'denied';
  setOptedOut(false);
  const { reg, sub: old } = await current();
  const sub = old ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(vapidKey) });
  const { error } = await client.from('push_subscriptions').upsert(row(sub, lang), { onConflict: 'user_id,endpoint' });
  if (error) throw error;
  return 'on';
}

// Самовосстановление: при запуске и возвращении в приложение гарантируем, что подписка есть и в браузере, и на сервере.
export async function syncPush({ client, vapidKey, lang }) {
  if (!vapidKey || !pushSupported()) return;
  const allowed = () => shouldSyncPush({ supported: true, permission: Notification.permission, optedOut: optedOut() });
  if (!allowed()) return;
  const { reg, sub: old } = await current();
  // Пока шёл await, пользователь мог выключить уведомления или выйти — перепроверяем перед каждым действием.
  if (!old && !allowed()) return;
  const sub = old ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(vapidKey) });
  if (!allowed()) { if (!old) await sub.unsubscribe().catch(() => {}); return; }
  const { error } = await client.from('push_subscriptions').upsert(row(sub, lang), { onConflict: 'user_id,endpoint' });
  if (error) throw error;
}

// byUser: выключено кнопкой (запоминаем, чтобы не включать само); при выходе из аккаунта — false.
export async function disablePush({ client, byUser = false }) {
  if (byUser) setOptedOut(true);
  const { sub } = await current();
  if (!sub) return 'off';
  await client.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
  await sub.unsubscribe();
  return 'off';
}

export async function updatePushLang({ client, lang }) {
  const { sub } = await current();
  if (sub) await client.from('push_subscriptions').update({ lang }).eq('endpoint', sub.endpoint);
}
