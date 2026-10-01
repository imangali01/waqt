import { daysLabel, prayerName } from '../../core/i18n.js';
import { initLang, tr, getLang } from '../i18n-dom.js';

const $ = (id) => document.getElementById(id);
let current = null;

function renderStreak(n) {
  $('streak-n').textContent = n;
  $('streak').classList.toggle('on', n > 0);
  $('streak').title = n > 0
    ? tr('streak.on', { n, days: daysLabel(getLang(), n) })
    : tr('streak.off');
}

let dotsKey = '';
function renderDots(dots) {
  // Пересобираем только при изменении: иначе кружок исчезает между нажатием и отпусканием.
  const key = JSON.stringify([dots.map((d) => [d.date, d.prayer, d.status]), getLang()]);
  if (key === dotsKey) return;
  dotsKey = key;
  $('dots').replaceChildren(
    ...dots.map((d) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = `dot ${d.status}`;
      el.title = prayerName(getLang(), d.prayer);
      el.disabled = d.status === 'upcoming';
      // Идущий — «прочитал», пропущенный — «прочитал позже», отмеченный — отмена.
      el.addEventListener('click', async () => {
        if (d.status === 'pending') await window.waqt.mark();
        else await window.waqt.toggleCell(d.date, d.prayer);
      });
      return el;
    }),
  );
}

function render(s) {
  current = s;
  renderDots(s.dots ?? []);
  renderStreak(s.streak ?? 0);
  const missed = s.missed ?? [];
  $('missed-btn').hidden = missed.length === 0;
  $('missed-btn').title = tr('missed.tip');
  $('missed-btn').textContent = missed.length ? `! ${missed.length}` : '';
  const chip = $('name-chip');
  chip.hidden = !s.name;
  if (!chip.hidden) {
    chip.textContent = s.name.translit;
    $('face-ar').textContent = s.name.arabic ?? '';
    $('face-tr').textContent = s.name.translit;
    $('face-tl').textContent = s.name.translation;
    $('face-desc').textContent = s.name.description ?? '';
  } else {
    $('name-face').hidden = true;
  }
  $('mark-btn').hidden = s.phase !== 'prayer';
  $('mark-btn').classList.toggle('done', Boolean(s.marked));

  if (s.phase === 'nodata') {
    $('kicker').textContent = tr('nodata.kicker');
    $('label').textContent = tr('nodata.label');
    $('sub').textContent = tr('nodata.sub');
    $('timer').textContent = '--:--';
    $('timer').className = 'timer level-normal';
    $('seconds').textContent = '';
    $('seconds').className = 'seconds level-normal';
    $('time').className = 'time';
    $('bar').style.width = '0';
    return;
  }
  // Отмеченный намаз остаётся спокойным: цвета, полоса и пульсация меняются только у непрочитанного.
  const level = s.marked ? 'normal' : (s.level ?? 'normal');
  const pulse = !s.marked && s.pulse;
  $('kicker').textContent = s.phase === 'prayer' ? tr('now') : tr('next');
  $('label').textContent = prayerName(getLang(), s.prayer);
  $('sub').textContent = s.phase === 'prayer' ? tr('until', { t: s.atText }) : tr('at', { t: s.atText });
  $('timer').textContent = s.text;
  $('timer').className = `timer level-${level}`;
  $('seconds').textContent = `:${s.seconds}`;
  $('seconds').className = `seconds level-${level}`;
  // Не трогаем bump, чтобы перерисовка каждую секунду не обрывала его анимацию.
  $('time').classList.toggle('pulse', pulse);
  $('bar').className = `level-${level}`;
  $('bar').style.width = s.progress == null ? '0' : `${Math.round(s.progress * 100)}%`;
}

window.waqt.onState(render);

$('mark-btn').addEventListener('click', async () => {
  if (current?.marked) await window.waqt.unmark();
  else await window.waqt.mark();
});

$('missed-btn').addEventListener('click', async () => {
  const first = current?.missed?.[0];
  if (first) await window.waqt.markMissed(first.date, first.prayer);
});

// Азан: только первые AZAN_MS миллисекунд, последние FADE_MS плавно затихает.
const AZAN_MS = 5500;
const FADE_MS = 700;
let azanTimer;

window.waqt.onAzan(() => {
  const a = $('azan');
  clearTimeout(azanTimer);
  a.volume = 1;
  a.currentTime = 0;
  a.play().catch(() => {});
  const start = performance.now();
  const fade = () => {
    const left = AZAN_MS - (performance.now() - start);
    if (left <= 0) { a.pause(); a.volume = 1; return; }
    a.volume = Math.min(1, left / FADE_MS);
    azanTimer = setTimeout(fade, 50);
  };
  fade();
});

window.waqt.onChime(() => {
  // Размер времени один раз увеличивается и уменьшается, чтобы звук было видно на экране.
  const t = $('time');
  t.classList.remove('bump');
  void t.offsetWidth;
  t.classList.add('bump');
  const a = $('chime');
  a.currentTime = 0;
  a.play().catch(() => {});
});

$('name-chip').addEventListener('click', () => { $('name-face').hidden = false; });
$('name-face').addEventListener('click', () => { $('name-face').hidden = true; });

window.waqt.onSync((s) => {
  $('sync').hidden = s.ok || s.reason === 'no-session' && false;
  $('sync').title = s.ok ? '' : tr('sync.error', { reason: s.reason });
});

window.waqt.onMode((m) => {
  const cl = document.documentElement.classList;
  // Средний = обычная раскладка, полоса = компактная; уменьшены через zoom (см. widget.css).
  const on = { full: ['scaled'], compact: ['compact', 'scaled'], medium: ['medium'], strip: ['compact', 'strip'] }[m] ?? [];
  for (const x of ['compact', 'medium', 'strip', 'scaled']) cl.toggle(x, on.includes(x));
});
$('view-btn').addEventListener('click', () => window.waqt.openSettings());

$('time').addEventListener('animationend', (e) => { if (e.animationName === 'bump') $('time').classList.remove('bump'); });

initLang(() => { if (current) render(current); });
