import { createWebApi } from './src/web/web-api.js';
import { t, LANGS, prayerName, daysLabel, normalizeLang } from './src/core/i18n.js';
import { nameOfDay } from './src/core/names.js';
import { addDays, dateOf } from './src/core/tz.js';
import { subscribeMarks } from './src/core/realtime.js';
import { pushState, enablePush, disablePush, updatePushLang, pushSupported } from './push-subscribe.js';
import { VAPID_PUBLIC_KEY } from '../config.js';

const $ = (id) => document.getElementById(id);
const AUTH_KEY = 'waqt.auth';
const embed = new URLSearchParams(location.search).has('embed') || window.top !== window;
const hasToken = () => {
  try { return (localStorage.getItem(AUTH_KEY) || '').includes('refresh_token'); } catch { return false; }
};

// До входа сайт — лендинг; приложение открывается только после входа (демо внутри лендинга — исключение).
if (!embed && !hasToken()) {
  location.replace('../');
  await new Promise(() => {});
}
if (embed) document.body.classList.add('embed');

const names = []; // 99 имён подгружаются позже в тот же массив
const chime = $('chime');
// Демо в iframe лендинга работает на отдельном хранилище в памяти: общий localStorage принадлежит настоящему приложению.
const memoryStorage = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => { m.set(k, v); } }; };
const { api, tick, refresh, syncNow, attachClient } = createWebApi({
  storage: embed ? memoryStorage() : window.localStorage,
  demo: embed,
  names,
  fetchFn: (...a) => fetch(...a),
  playChime: () => { chime.currentTime = 0; chime.play().catch(() => {}); },
});

const HIST_DAYS = 40;
let lang = 'ru';
let snap = null;
let rowsKey = '';
let histKey = '';

const ICONS = {
  fajr: '<path d="M4 16h16M7 16a5 5 0 0 1 10 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M12 5v2M5.500 8.500l1.400 1.400M18.500 8.500l-1.400 1.400" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  sun: '<circle cx="12" cy="13" r="4" fill="currentColor"/><path d="M12 4v2.500M3 13h2.500M18.500 13H21M5.600 6.600l1.700 1.700M18.400 6.600l-1.700 1.700" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
};
const CHECK = '<svg viewBox="0 0 24 24" width="14" height="14"><path d="M5 12.500l4.500 4.500L19 7.500" fill="none" stroke="#fff" stroke-width="3.200" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const CROSS = '<svg viewBox="0 0 24 24" width="12" height="12"><path d="M7 7l10 10M17 7L7 17" stroke="#fff" stroke-width="3.200" stroke-linecap="round"/></svg>';

function applyStatic() {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = t(lang, el.dataset.i18n);
  $('lang-btn').textContent = lang.toUpperCase();
  $('city').textContent = t(lang, 'app.city');
  $('account-btn').setAttribute('aria-label', t(lang, 'app.logout'));
  $('account-btn').title = t(lang, 'app.logout');
  try {
    $('now-date').textContent = new Date().toLocaleDateString(lang === 'ar' ? 'ar-u-nu-latn' : lang === 'kk' ? 'kk' : 'ru', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Almaty' });
  } catch { /* старый браузер */ }
}

function renderNow() {
  const s = snap;
  const strip = $('strip');
  if (!s || s.phase === 'nodata') {
    $('strip-name').textContent = t(lang, 'nodata.label');
    $('strip-sub').textContent = t(lang, 'nodata.sub');
    $('timer').textContent = '--:--';
    $('seconds').textContent = '';
    $('mark-btn').hidden = true;
    return;
  }
  document.body.dataset.phase = s.prayer;
  const level = s.level ?? 'normal';
  strip.className = `strip level-${level}${s.pulse ? ' pulse' : ''}`;
  $('strip-name').textContent = prayerName(lang, s.prayer);
  $('strip-sub').textContent = `${s.phase === 'prayer' ? t(lang, 'now') : t(lang, 'next')} · ${s.phase === 'prayer' ? t(lang, 'until', { t: s.atText }) : t(lang, 'at', { t: s.atText })}`;
  $('timer').textContent = s.text;
  $('seconds').textContent = `:${s.seconds}`;
  const mark = $('mark-btn');
  mark.hidden = s.phase !== 'prayer';
  mark.classList.toggle('done', Boolean(s.marked));
  mark.textContent = s.marked ? `✓ ${t(lang, 'app.marked')}` : t(lang, 'app.mark');
  document.title = `${s.text} · ${prayerName(lang, s.prayer)}`;
}

function renderStreak() {
  const n = snap?.streak ?? 0;
  $('streak-n').textContent = n;
  $('streak-card').classList.toggle('on', n > 0);
  $('streak-label').textContent = n > 0 ? daysLabel(lang, n) : t(lang, 'streak.off');
  const onTime = (snap?.dots ?? []).filter((d) => d.status === 'on_time').length;
  $('day-bar').style.width = `${onTime * 20}%`;
  $('day-count').textContent = t(lang, 'app.daycount', { n: onTime });
}

function renderName() {
  const name = names.length && snap?.date ? nameOfDay(names, snap.date) : null;
  $('name-card').hidden = !name;
  if (!name) return;
  $('name-ar').textContent = name.arabic ?? '';
  $('name-tr').textContent = name.translit ?? '';
  $('name-tl').textContent = name.translation ?? '';
}

function statusIcon(status) {
  if (status === 'on_time' || status === 'late') return CHECK;
  if (status === 'missed') return CROSS;
  return '';
}

async function renderRows() {
  const [day, times] = await Promise.all([api.getDay(), api.getTimes()]);
  const active = snap?.prayer;
  const key = JSON.stringify([day, times?.sunrise, active, lang]);
  if (key === rowsKey) return;
  rowsKey = key;

  const list = [];
  for (const d of day) {
    if (d.prayer === 'dhuhr' && times?.sunrise) list.push({ kind: 'sun', time: times.sunrise });
    list.push({ kind: 'prayer', ...d });
  }
  $('rows').replaceChildren(...list.map((item) => {
    const li = document.createElement('li');
    if (item.kind === 'sun') {
      li.className = 'r sun';
      li.innerHTML = `<span class="r-name"></span><span class="r-ic"><svg viewBox="0 0 24 24" width="20" height="20">${ICONS.sun}</svg></span><span class="r-time"></span>`;
      li.querySelector('.r-name').textContent = t(lang, 'st.sunrise');
      li.querySelector('.r-time').textContent = item.time;
      return li;
    }
    li.className = `r ${item.status}${item.prayer === active ? ' active' : ''}`;
    li.innerHTML = '<span class="r-name"></span><span class="r-ic"><span class="st"></span></span><span class="r-time"></span>';
    li.querySelector('.r-name').textContent = prayerName(lang, item.prayer);
    li.querySelector('.r-time').textContent = item.start;
    const st = li.querySelector('.st');
    st.innerHTML = statusIcon(item.status);
    // Кружок кликабелен: идущий — «прочитал», пропущенный — «прочитал позже», отмеченный — отмена.
    if (item.status !== 'upcoming') {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'st-btn';
      b.innerHTML = st.innerHTML;
      b.title = t(lang, item.status === 'pending' ? 'app.mark' : item.status === 'missed' ? 'app.markLate' : item.status === 'late' ? 'app.mark' : 'app.undo');
      b.addEventListener('click', async () => {
        if (item.status === 'pending') await api.mark();
        else await api.toggleCell(dateOf(new Date()), item.prayer);
        refreshAll();
      });
      st.replaceChildren(b);
    }
    return li;
  }));
  renderHistory();
}

async function renderHistory() {
  const today = dateOf(new Date());
  const cols = await api.getHistory(addDays(today, -(HIST_DAYS - 1)), HIST_DAYS);
  const key = JSON.stringify([cols, lang]);
  if (key === histKey) return;
  histKey = key;
  const rows = [];
  const head = document.createElement('div');
  head.className = 'h-row';
  for (const c of cols) {
    const d = document.createElement('span');
    d.className = `h-date${c.date === today ? ' today' : ''}`;
    d.textContent = `${c.date.slice(8, 10)}.${c.date.slice(5, 7)}`;
    head.append(d);
  }
  rows.push(head);
  const labels = [];
  for (const prayer of ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']) {
    const label = document.createElement('span');
    label.textContent = prayerName(lang, prayer);
    labels.push(label);
    const row = document.createElement('div');
    row.className = 'h-row';
    for (const c of cols) {
      const status = c.cells.find((x) => x.prayer === prayer).status;
      const cell = document.createElement('button');
      cell.className = `cell ${status}`;
      cell.setAttribute('aria-label', `${c.date} ${prayerName(lang, prayer)}`);
      cell.addEventListener('click', async () => { if (await api.toggleCell(c.date, prayer)) refreshAll(); });
      row.append(cell);
    }
    rows.push(row);
  }
  $('hist-names').replaceChildren(...labels);
  $('hist').replaceChildren(...rows);
  // Свежие дни справа: прокручиваем к концу.
  const sc = document.querySelector('.hist-scroll');
  requestAnimationFrame(() => { sc.scrollLeft = sc.scrollWidth; });
}

function refreshAll() {
  rowsKey = ''; histKey = '';
  tick();
}

api.onState((s) => {
  snap = s;
  renderNow();
  renderStreak();
  renderName();
  renderRows();
});

// Кнопка уведомлений: появляется после входа, если ключ VAPID задан и браузер умеет push
// (на iPhone — только когда сайт добавлен «На экран Домой»).
let pushClient = null;
async function renderPush() {
  const btn = $('push-btn');
  const st = pushClient && VAPID_PUBLIC_KEY && pushSupported() ? await pushState() : 'unsupported';
  btn.hidden = st === 'unsupported';
  btn.classList.toggle('off', st !== 'on');
  btn.title = t(lang, st === 'on' ? 'push.on' : st === 'denied' ? 'push.denied' : 'push.off');
  btn.setAttribute('aria-label', btn.title);
}
$('push-btn').addEventListener('click', async () => {
  try {
    if (await pushState() === 'on') await disablePush({ client: pushClient });
    else await enablePush({ client: pushClient, vapidKey: VAPID_PUBLIC_KEY, lang });
  } catch { /* нет сети или отказ — состояние кнопки покажет результат */ }
  renderPush();
});

api.onLang((l) => {
  lang = normalizeLang(l);
  applyStatic();
  renderPush();
  if (pushClient) updatePushLang({ client: pushClient, lang }).catch(() => {});
  rowsKey = ''; histKey = '';
  if (snap) { renderNow(); renderStreak(); renderName(); renderRows(); }
});

$('mark-btn').addEventListener('click', async () => { if (!snap?.marked) { await api.mark(); refreshAll(); } });
$('lang-btn').addEventListener('click', () => api.setLang(LANGS[(LANGS.indexOf(lang) + 1) % LANGS.length]));

api.getSettings().then((s) => { lang = normalizeLang(s.lang); applyStatic(); tick(); });

fetch('names.json').then((r) => r.json()).then((list) => { names.push(...list); renderName(); }).catch(() => {});
setInterval(tick, 1000);
refresh().then(tick);
setInterval(() => refresh().then(tick), 5 * 3600e3);
document.addEventListener('visibilitychange', () => { if (!document.hidden) { refresh().then(tick); syncNow(); } });
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});

// Аккаунт: Supabase подключается после показа таймера. Без сети остаёмся в приложении по сохранённой сессии.
if (!embed) {
  try {
    const { client, currentUser, signOut } = await import('../auth.js');
    attachClient(client);
    const user = await currentUser();
    if (!user && navigator.onLine) {
      // Сессия недействительна: сбрасываем и показываем лендинг с входом.
      try { localStorage.removeItem(AUTH_KEY); } catch { /* ignore */ }
      location.replace('../');
    } else {
      const btn = $('account-btn');
      btn.hidden = false;
      btn.addEventListener('click', async () => {
        if (!confirm(t(lang, 'app.logout') + '?')) return;
        // Подписку убираем до выхода: после него RLS уже не даст её удалить.
        await disablePush({ client }).catch(() => {});
        await signOut();
        try { localStorage.removeItem(AUTH_KEY); } catch { /* ignore */ }
        location.replace('../');
      });
      if (user) {
        pushClient = client;
        renderPush();
        syncNow().then(tick);
        // Отметки с других устройств (десктоп) приходят сразу.
        subscribeMarks({ client, userId: user.id, onChange: () => syncNow().then(tick) });
      }
      setInterval(() => { syncNow().then(tick); }, 60e3); // страховка, если Realtime не дошёл
    }
  } catch { /* нет сети до CDN — работаем локально */ }
}
