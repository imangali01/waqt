const $ = (id) => document.getElementById(id);
const FIFTEEN_MIN = 15 * 60 * 1000;

function render(s) {
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
