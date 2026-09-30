import { createWebApi } from './src/web/api.js';

// window.waqt должен появиться синхронно: widget.js подключается сразу после этого модуля.
const names = []; // 99 имён подгружаются позже в тот же массив
const chime = document.getElementById('chime');
const { api, tick, refresh, syncNow, attachClient } = createWebApi({
  storage: window.localStorage,
  names,
  fetchFn: (...a) => fetch(...a),
  playChime: () => { chime.currentTime = 0; chime.play().catch(() => {}); },
  onSync: (res) => { const dot = document.getElementById('sync'); if (dot) { dot.hidden = res.ok || res.reason === 'no-session'; dot.title = res.ok ? '' : res.reason; } },
});
window.waqt = api;

fetch('names.json').then((r) => r.json()).then((list) => { names.push(...list); tick(); }).catch(() => {});

// Масштаб карточки под ширину экрана.
const fit = () => {
  const z = Math.max(1, Math.min(2.2, Math.min(innerWidth - 32, innerHeight - 64) / 200));
  document.documentElement.style.setProperty('--zoom', z.toFixed(2));
};
fit();
addEventListener('resize', fit);

tick();
setInterval(tick, 1000);
refresh().then(tick);
setInterval(() => refresh().then(tick), 5 * 3600e3);
document.addEventListener('visibilitychange', () => { if (!document.hidden) { refresh().then(tick); syncNow(); } });

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});

// Аккаунт: подключаем Supabase после показа таймера; при сбое сети виджет продолжает работать локально.
const btn = document.getElementById('account-btn');
const embedded = window.top !== window; // демо-виджет внутри лендинга: без входа
try {
  if (embedded) throw new Error('embedded');
  const { client, currentUser, signOut } = await import('../auth.js');
  const { openLogin } = await import('../login-dialog.js');
  attachClient(client);
  let user = await currentUser();
  const paint = () => { btn.textContent = user ? 'Выйти' : 'Зайти'; btn.hidden = false; };
  paint();
  if (user) syncNow().then(tick);
  setInterval(() => { if (user) syncNow().then(tick); }, 5 * 60e3);
  btn.addEventListener('click', async () => {
    if (user) {
      await signOut();
      user = null;
      paint();
      location.replace('../');
    } else {
      openLogin(async () => { user = await currentUser(); paint(); syncNow().then(tick); });
    }
  });
} catch {
  // Нет сети до CDN — кнопки входа нет, остальное работает.
}
