import { daysWord } from '../../core/plural.js';

const $ = (id) => document.getElementById(id);
let current = null;

function renderStreak(n) {
  $('streak-n').textContent = n;
  $('streak').classList.toggle('on', n > 0);
  $('streak').title = n > 0
    ? `Серия: ${n} ${daysWord(n)} подряд, все 5 намазов вовремя`
    : 'Серия начнётся, когда все 5 намазов будут прочитаны вовремя';
}

function renderDots(dots) {
  $('dots').replaceChildren(
    ...dots.map((d) => {
      const el = document.createElement('span');
      el.className = `dot ${d.status}`;
      el.title = d.name;
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
  $('missed-btn').title = 'Отметить пропущенный намаз как прочитанный позже';
  $('missed-btn').textContent = missed.length ? `! ${missed.length}` : '';
  const chip = $('name-chip');
  chip.hidden = !(s.phase === 'gap' && s.name);
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
    $('kicker').textContent = 'Нет данных';
    $('label').textContent = 'Время намаза';
    $('sub').textContent = 'не загружено';
    $('timer').textContent = '--:--';
    $('timer').className = 'timer level-normal';
    $('seconds').textContent = '';
    $('bar').style.width = '0';
    return;
  }
  const level = s.level ?? 'normal';
  $('kicker').textContent = s.phase === 'prayer' ? 'Сейчас' : 'Следующий';
  $('label').textContent = s.prayerName;
  $('sub').textContent = s.phase === 'prayer' ? `до ${s.atText}` : `в ${s.atText}`;
  $('timer').textContent = s.text;
  $('timer').className = `timer level-${level}${s.pulse ? ' pulse' : ''}`;
  $('seconds').textContent = `:${s.seconds}`;
  $('bar').className = `level-${level}`;
  $('bar').style.width = s.progress == null ? '0' : `${Math.round(s.progress * 100)}%`;
}

window.waqt.onState(render);

$('mark-btn').addEventListener('click', async () => {
  if (current?.marked) return;
  await window.waqt.mark();
});

$('missed-btn').addEventListener('click', async () => {
  const first = current?.missed?.[0];
  if (first) await window.waqt.markMissed(first.date, first.prayer);
});

// Азан: только первые AZAN_MS миллисекунд, последние FADE_MS плавно затихает.
const AZAN_MS = 5000;
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
  const a = $('chime');
  a.currentTime = 0;
  a.play().catch(() => {});
});

$('name-chip').addEventListener('click', () => { $('name-face').hidden = false; });
$('name-face').addEventListener('click', () => { $('name-face').hidden = true; });

window.waqt.onSync((s) => {
  $('sync').hidden = s.ok || s.reason === 'no-session' && false;
  $('sync').title = s.ok ? '' : `Не синхронизировано: ${s.reason}`;
});
