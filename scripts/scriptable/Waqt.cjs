// Waqt — виджет для iPhone (приложение Scriptable): сколько осталось до конца текущего намаза.
// Установка: Scriptable → «+» → вставить этот файл целиком → назвать «Waqt» → на домашнем экране
// добавить виджет Scriptable (малый) → Script: Waqt. В поле Parameter можно указать язык: ru, kk или ar.
// Таймер тикает сам (системный таймер iOS); цвет и надписи обновляются в пороговые моменты (за 30, 15 минут и в конце окна).
// Отметки «прочитал» и звуки в этом виджете не поддерживаются: это делает приложение на компьютере.

const LAT = 51.133333;
const LON = 71.433333;
const MIN = 60000;
const PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
const END_OF = { fajr: 'sunrise', dhuhr: 'asr', asr: 'sunset', maghrib: 'isha' };

const NAMES = {
  ru: { fajr: 'Фаджр', dhuhr: 'Зухр', asr: 'Аср', maghrib: 'Магриб', isha: 'Иша' },
  kk: { fajr: 'Таң', dhuhr: 'Бесін', asr: 'Екінті', maghrib: 'Ақшам', isha: 'Құптан' },
  ar: { fajr: 'الفجر', dhuhr: 'الظهر', asr: 'العصر', maghrib: 'المغرب', isha: 'العشاء' },
};
const TEXT = {
  ru: { now: 'Сейчас', next: 'Следующий', until: (t) => `до ${t}`, at: (t) => `в ${t}`, nodata: 'Нет данных' },
  kk: { now: 'Қазір', next: 'Келесі', until: (t) => `${t} дейін`, at: (t) => `${t} сағ.`, nodata: 'Дерек жоқ' },
  ar: { now: 'الآن', next: 'التالي', until: (t) => `حتى ${t}`, at: (t) => `في ${t}`, nodata: 'لا بيانات' },
};
const lang = (l) => (NAMES[l] ? l : 'ru');
const tr = (l, prayer) => NAMES[lang(l)][prayer];

// ---- время (Астана, UTC+5) ----
const toInstant = (date, hm) => new Date(`${date}T${hm}:00+05:00`);
const dateOf = (d) => new Date(d.getTime() + 5 * 3600e3).toISOString().slice(0, 10);
const hmOf = (d) => new Date(d.getTime() + 5 * 3600e3).toISOString().slice(11, 16);
function addDays(date, n) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function windowsForDate(days, date) {
  const t = days[date];
  if (!t) return [];
  const out = [];
  for (const prayer of PRAYERS) {
    let end;
    if (prayer === 'isha') {
      const nextDay = days[addDays(date, 1)];
      if (!nextDay) continue;
      end = toInstant(addDays(date, 1), nextDay.fajr);
    } else {
      end = toInstant(date, t[END_OF[prayer]]);
    }
    out.push({ date, prayer, start: toInstant(date, t[prayer]), end });
  }
  return out;
}

const levelFor = (ms) => (ms < 15 * MIN ? 'critical' : ms < 30 * MIN ? 'warn' : 'normal');

// Состояние на момент now: идёт намаз (endsAt — конец окна) или пауза (endsAt — начало следующего).
function stateAt(days, now) {
  const today = dateOf(now);
  const windows = [-1, 0, 1]
    .flatMap((d) => windowsForDate(days, addDays(today, d)))
    .sort((a, b) => a.start - b.start);
  const cur = windows.find((w) => w.start <= now && now < w.end);
  if (cur) {
    const remaining = cur.end - now;
    return { phase: 'prayer', prayer: cur.prayer, start: cur.start, endsAt: cur.end, level: levelFor(remaining), atText: hmOf(cur.end), progress: remaining / (cur.end - cur.start) };
  }
  const next = windows.find((w) => w.start > now);
  if (next) return { phase: 'gap', prayer: next.prayer, start: now, endsAt: next.start, level: 'normal', atText: hmOf(next.start), progress: null };
  return { phase: 'nodata' };
}

// Когда iOS стоит перезапустить виджет: ближайший порог цвета или смена окна (не чаще раза в минуту).
function nextRefresh(s, now) {
  if (s.phase === 'nodata') return new Date(now.getTime() + 30 * MIN);
  const marks = s.phase === 'prayer' ? [s.endsAt - 30 * MIN, s.endsAt - 15 * MIN, s.endsAt] : [s.endsAt];
  const upcoming = marks.filter((m) => m > now.getTime()).sort((a, b) => a - b)[0] ?? now.getTime() + 30 * MIN;
  return new Date(Math.max(upcoming, now.getTime() + MIN));
}

// ---- данные ----
function parseYear(json) {
  const days = {};
  for (const r of json.result) {
    days[r.Date] = { fajr: r.fajr, sunrise: r.sunrise, dhuhr: r.dhuhr, asr: r.asr, sunset: r.sunset, maghrib: r.maghrib, isha: r.isha, midnight: r.midnight };
  }
  return days;
}

async function loadDays(now) {
  const fm = FileManager.local();
  const file = fm.joinPath(fm.documentsDirectory(), 'waqt-times.json');
  const days = fm.fileExists(file) ? JSON.parse(fm.readString(file)) : {};
  const today = dateOf(now);
  const y = Number(today.slice(0, 4));
  const years = [y];
  if (today >= `${y}-12-25`) years.push(y + 1);
  if (today <= `${y}-01-02`) years.push(y - 1);
  let fetched = false;
  for (const yr of years) {
    if (days[`${yr}-06-15`] && yr !== y) continue;
    try {
      const req = new Request(`https://api.muftyat.kz/prayer-times/${yr}/${LAT}/${LON}`);
      req.timeoutInterval = 10;
      Object.assign(days, parseYear(await req.loadJSON()));
      fetched = true;
    } catch (e) { /* нет сети — остаёмся на кэше */ }
  }
  if (fetched) fm.writeString(file, JSON.stringify(days));
  return days;
}

// ---- виджет ----
function drawBar(progress, color) {
  const W = 260;
  const dc = new DrawContext();
  dc.size = new Size(W, 10);
  dc.opaque = false;
  dc.respectScreenScale = true;
  const track = new Path();
  track.addRoundedRect(new Rect(0, 0, W, 10), 5, 5);
  dc.addPath(track);
  dc.setFillColor(new Color('#EEF0F2'));
  dc.fillPath();
  const filled = Math.max(10, Math.round(W * progress));
  const fill = new Path();
  fill.addRoundedRect(new Rect(0, 0, filled, 10), 5, 5);
  dc.addPath(fill);
  dc.setFillColor(color);
  dc.fillPath();
  return dc.getImage();
}

async function main() {
  const l = lang(String(args.widgetParameter ?? 'ru').trim().toLowerCase());
  const T = TEXT[l];
  const INK = new Color('#0d0f12');
  const MUTED = new Color('#7d848b');
  const ORANGE = new Color('#F08A1C');
  const LEVEL = { normal: INK, warn: new Color('#E53935'), critical: new Color('#7A0019') };

  const now = new Date();
  const s = stateAt(await loadDays(now), now);

  const w = new ListWidget();
  w.backgroundColor = Color.white();
  w.setPadding(14, 14, 12, 14);
  w.refreshAfterDate = nextRefresh(s, now);

  if (s.phase === 'nodata') {
    const t = w.addText(T.nodata);
    t.font = Font.boldSystemFont(16);
    t.textColor = INK;
    return w;
  }

  const kicker = w.addText((s.phase === 'prayer' ? T.now : T.next).toUpperCase());
  kicker.font = Font.heavySystemFont(11);
  kicker.textColor = ORANGE;
  const name = w.addText(tr(l, s.prayer));
  name.font = Font.heavySystemFont(24);
  name.textColor = INK;
  name.minimumScaleFactor = 0.6;
  const sub = w.addText(s.phase === 'prayer' ? T.until(s.atText) : T.at(s.atText));
  sub.font = Font.mediumSystemFont(12);
  sub.textColor = MUTED;
  w.addSpacer();

  const timer = w.addDate(s.endsAt);
  timer.applyTimerStyle();
  timer.font = Font.heavySystemFont(34);
  timer.textColor = LEVEL[s.level];
  timer.minimumScaleFactor = 0.6;

  if (s.progress != null) {
    w.addSpacer(6);
    const bar = w.addImage(drawBar(Math.max(0, Math.min(1, s.progress)), s.level === 'normal' ? new Color('#2BA36B') : LEVEL[s.level]));
    bar.imageSize = new Size(130, 5);
  }
  return w;
}

if (typeof ListWidget !== 'undefined') {
  main().then((w) => {
    if (config.runsInWidget) Script.setWidget(w);
    else w.presentSmall();
    Script.complete();
  });
}

if (typeof module !== 'undefined') module.exports = { stateAt, nextRefresh, windowsForDate, tr, parseYear };
