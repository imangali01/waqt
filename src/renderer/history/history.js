import { daysLabel, prayerName } from '../../core/i18n.js';
import { initLang, getLang, tr } from '../i18n-dom.js';

const $ = (id) => document.getElementById(id);
const PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
const COUNT = 14;

const todayAstana = () => new Date(Date.now() + 5 * 3600e3).toISOString().slice(0, 10);
const shift = (date, n) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const short = (date) => `${date.slice(8, 10)}.${date.slice(5, 7)}`;

let start = shift(todayAstana(), -(COUNT - 1));

async function load() {
  const cols = await window.waqt.getHistory(start, COUNT);
  $('h-month').value = start.slice(0, 7);
  const today = todayAstana();

  const head = document.createElement('div');
  head.className = 'h-row';
  head.append(document.createElement('div'));
  for (const c of cols) {
    const d = document.createElement('div');
    d.className = `h-date${c.date === today ? ' today' : ''}`;
    d.textContent = short(c.date);
    head.append(d);
  }

  const rows = [head];
  for (const prayer of PRAYERS) {
    const row = document.createElement('div');
    row.className = 'h-row';
    const label = document.createElement('div');
    label.className = 'h-prayer';
    label.textContent = prayerName(getLang(), prayer);
    row.append(label);
    for (const c of cols) {
      const status = c.cells.find((x) => x.prayer === prayer).status;
      const cell = document.createElement('button');
      cell.className = `cell ${status}`;
      cell.textContent = prayerName(getLang(), prayer);
      cell.addEventListener('click', async () => {
        if (await window.waqt.toggleCell(c.date, prayer)) load();
      });
      row.append(cell);
    }
    rows.push(row);
  }
  $('h-table').replaceChildren(...rows);
}

function enterHistory() {
  document.documentElement.classList.add('history-mode');
  $('history').hidden = false;
  load().then(() => requestAnimationFrame(() => $('history').classList.add('visible')));
}

function leaveHistory() {
  $('history').classList.remove('visible');
  $('history').hidden = true;
  document.documentElement.classList.remove('history-mode');
}

$('history-btn').addEventListener('click', () => window.waqt.openHistory());
$('h-close').addEventListener('click', () => window.waqt.closeHistory());
$('h-prev').addEventListener('click', () => { start = shift(start, -7); load(); });
$('h-next').addEventListener('click', () => { start = shift(start, 7); load(); });
$('h-month').addEventListener('change', (e) => {
  if (e.target.value) { start = `${e.target.value}-01`; load(); }
});

let streakN = 0;
function renderStreak() {
  $('h-streak').textContent = tr('h.streak', { n: streakN, days: daysLabel(getLang(), streakN) });
  $('h-streak').classList.toggle('on', streakN > 0);
}
window.waqt.onState((s) => { streakN = s.streak ?? 0; renderStreak(); });
initLang(() => { renderStreak(); if (!$('history').hidden) load(); });

window.waqt.onView((v) => (v === 'history' ? enterHistory() : leaveHistory()));
window.waqt.onOpenHistoryRequest(() => window.waqt.openHistory());
