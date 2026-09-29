const $ = (id) => document.getElementById(id);
const FIFTEEN_MIN = 15 * 60 * 1000;
let current = null;

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
  $('timer').className = `timer level-${level}`;
  $('seconds').textContent = s.remainingMs >= FIFTEEN_MIN ? `:${s.seconds}` : '';
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

window.waqt.onChime(() => {
  const a = $('chime');
  a.currentTime = 0;
  a.play().catch(() => {});
});

$('name-chip').addEventListener('click', () => { $('name-face').hidden = false; });
$('name-face').addEventListener('click', () => { $('name-face').hidden = true; });
