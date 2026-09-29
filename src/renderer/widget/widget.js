const $ = (id) => document.getElementById(id);

function render(s) {
  if (s.phase === 'nodata') {
    $('label').textContent = 'Нет данных о времени';
    $('timer').textContent = '--:--';
    $('timer').className = 'timer level-normal';
    return;
  }
  $('label').textContent = s.phase === 'prayer' ? `${s.prayerName} — до конца` : `До ${s.prayerName}`;
  $('timer').textContent = s.text;
  $('timer').className = `timer level-${s.level ?? 'normal'}`;
}

window.waqt.onState(render);
