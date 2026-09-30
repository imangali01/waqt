import { createWebApi } from './src/web/api.js';

// window.waqt должен появиться синхронно: widget.js подключается сразу после этого модуля.
const names = []; // 99 имён подгружаются позже в тот же массив
const chime = document.getElementById('chime');
const { api, tick, refresh } = createWebApi({
  storage: window.localStorage,
  names,
  fetchFn: (...a) => fetch(...a),
  playChime: () => { chime.currentTime = 0; chime.play().catch(() => {}); },
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
document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh().then(tick); });

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
