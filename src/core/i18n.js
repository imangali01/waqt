import { daysWord } from './plural.js';

export const LANGS = ['ru', 'kk', 'ar'];
export const LANG_NAMES = { ru: 'Русский', kk: 'Қазақша', ar: 'العربية' };

const ru = {
  now: 'Сейчас', next: 'Следующий', until: 'до {t}', at: 'в {t}',
  'nodata.kicker': 'Нет данных', 'nodata.label': 'Время намаза', 'nodata.sub': 'не загружено',
  'streak.on': 'Серия: {n} {days} подряд, все 5 намазов вовремя',
  'streak.off': 'Серия начнётся, когда все 5 намазов будут прочитаны вовремя',
  'streak.tip': 'Серия: дней подряд, когда все 5 намазов прочитаны вовремя',
  'history.tip': 'История намазов', 'settings.tip': 'Настройки', 'mark.tip': 'Я прочитал',
  'missed.tip': 'Отметить пропущенный намаз как прочитанный позже', 'name.tip': 'Имя Аллаха дня',
  'sync.error': 'Не синхронизировано: {reason}',
  'h.title': 'История намазов', 'h.streak': 'Серия: {n} {days}',
  'h.prev': 'На неделю назад', 'h.next': 'На неделю вперёд', 'h.month': 'Месяц', 'h.close': 'Закрыть',
  'lg.on_time': 'вовремя', 'lg.late': 'позже', 'lg.missed': 'пропущен', 'lg.nodata': 'нет данных',
  'h.hint': 'Клик: красный или серый — «прочитан позже», зелёный или жёлтый — отменить',
  'settings.title': 'Настройки', 'settings.size': 'Размер окна', 'settings.lang': 'Язык',
  'settings.taskbar': 'Показывать в панели задач', 'settings.taskbar.hint': 'Включите, чтобы закрепить Waqt на панели задач. Выключено — окно остаётся только на экране.',
  'size.full': 'Обычный', 'size.compact': 'Компактный', 'size.medium': 'Средний', 'size.strip': 'Полоса',
  'login.title': 'Вход в Waqt', 'login.sub': 'Чтобы история намазов сохранялась в облаке.',
  'login.password': 'Пароль', 'login.go': 'Войти', 'login.fail': 'Не удалось войти',
  'login.badcreds': 'Неверный email или пароль', 'login.noconfig': 'Supabase не настроен (.env)',
  'tray.toggle': 'Показать / Скрыть', 'tray.settings': 'Настройки', 'tray.history': 'История',
  'tray.login': 'Войти в аккаунт', 'tray.quit': 'Выйти', 'win.settings': 'Настройки Waqt',
};

const kk = {
  now: 'Қазір', next: 'Келесі', until: '{t} дейін', at: '{t} сағ.',
  'nodata.kicker': 'Дерек жоқ', 'nodata.label': 'Намаз уақыты', 'nodata.sub': 'жүктелмеді',
  'streak.on': 'Қатарынан {n} {days}: 5 намаз да уақытында',
  'streak.off': '5 намаз да уақытында оқылғанда серия басталады',
  'streak.tip': 'Серия: 5 намаз да уақытында оқылған күндер қатары',
  'history.tip': 'Намаз тарихы', 'settings.tip': 'Баптаулар', 'mark.tip': 'Оқыдым',
  'missed.tip': 'Өткізілген намазды кейін оқылды деп белгілеу', 'name.tip': 'Күннің Алла есімі',
  'sync.error': 'Синхрондалмады: {reason}',
  'h.title': 'Намаз тарихы', 'h.streak': 'Серия: {n} {days}',
  'h.prev': 'Бір апта артқа', 'h.next': 'Бір апта алға', 'h.month': 'Ай', 'h.close': 'Жабу',
  'lg.on_time': 'уақытында', 'lg.late': 'кейін', 'lg.missed': 'өткізілді', 'lg.nodata': 'дерек жоқ',
  'h.hint': 'Басу: қызыл немесе сұр — «кейін оқылды», жасыл немесе сары — болдырмау',
  'settings.title': 'Баптаулар', 'settings.size': 'Терезе өлшемі', 'settings.lang': 'Тіл',
  'settings.taskbar': 'Тапсырмалар тақтасында көрсету', 'settings.taskbar.hint': 'Waqt-ты тапсырмалар тақтасына бекіту үшін қосыңыз. Өшірулі болса, терезе тек экранда тұрады.',
  'size.full': 'Қалыпты', 'size.compact': 'Ықшам', 'size.medium': 'Орташа', 'size.strip': 'Жолақ',
  'login.title': 'Waqt-қа кіру', 'login.sub': 'Намаз тарихы бұлтта сақталуы үшін.',
  'login.password': 'Құпиясөз', 'login.go': 'Кіру', 'login.fail': 'Кіру мүмкін болмады',
  'login.badcreds': 'Email немесе құпиясөз қате', 'login.noconfig': 'Supabase бапталмаған (.env)',
  'tray.toggle': 'Көрсету / Жасыру', 'tray.settings': 'Баптаулар', 'tray.history': 'Тарих',
  'tray.login': 'Аккаунтқа кіру', 'tray.quit': 'Шығу', 'win.settings': 'Waqt баптаулары',
};

const ar = {
  now: 'الآن', next: 'التالي', until: 'حتى {t}', at: 'في {t}',
  'nodata.kicker': 'لا بيانات', 'nodata.label': 'وقت الصلاة', 'nodata.sub': 'لم يتم التحميل',
  'streak.on': 'سلسلة: {n} {days} متتالية، كل الصلوات الخمس في وقتها',
  'streak.off': 'تبدأ السلسلة عند أداء الصلوات الخمس كلها في وقتها',
  'streak.tip': 'السلسلة: أيام متتالية أُدّيت فيها الصلوات الخمس في وقتها',
  'history.tip': 'سجل الصلوات', 'settings.tip': 'الإعدادات', 'mark.tip': 'صلّيت',
  'missed.tip': 'تحديد الصلاة الفائتة كمقضية لاحقًا', 'name.tip': 'اسم الله لهذا اليوم',
  'sync.error': 'لم تتم المزامنة: {reason}',
  'h.title': 'سجل الصلوات', 'h.streak': 'السلسلة: {n} {days}',
  'h.prev': 'أسبوع للخلف', 'h.next': 'أسبوع للأمام', 'h.month': 'الشهر', 'h.close': 'إغلاق',
  'lg.on_time': 'في وقتها', 'lg.late': 'متأخرة', 'lg.missed': 'فائتة', 'lg.nodata': 'لا بيانات',
  'h.hint': 'النقر: الأحمر أو الرمادي — «صُلّيت لاحقًا»، الأخضر أو الأصفر — تراجع',
  'settings.title': 'الإعدادات', 'settings.size': 'حجم النافذة', 'settings.lang': 'اللغة',
  'settings.taskbar': 'إظهار في شريط المهام', 'settings.taskbar.hint': 'فعّله لتثبيت Waqt في شريط المهام. عند الإيقاف تبقى النافذة على الشاشة فقط.',
  'size.full': 'عادي', 'size.compact': 'مضغوط', 'size.medium': 'متوسط', 'size.strip': 'شريط',
  'login.title': 'تسجيل الدخول إلى Waqt', 'login.sub': 'لحفظ سجل الصلوات في السحابة.',
  'login.password': 'كلمة المرور', 'login.go': 'دخول', 'login.fail': 'تعذّر تسجيل الدخول',
  'login.badcreds': 'البريد أو كلمة المرور غير صحيحة', 'login.noconfig': 'Supabase غير مهيأ (.env)',
  'tray.toggle': 'إظهار / إخفاء', 'tray.settings': 'الإعدادات', 'tray.history': 'السجل',
  'tray.login': 'تسجيل الدخول', 'tray.quit': 'خروج', 'win.settings': 'إعدادات Waqt',
};

export const DICT = { ru, kk, ar };

const PRAYERS = {
  ru: { fajr: 'Фаджр', dhuhr: 'Зухр', asr: 'Аср', maghrib: 'Магриб', isha: 'Иша' },
  kk: { fajr: 'Таң', dhuhr: 'Бесін', asr: 'Екінті', maghrib: 'Ақшам', isha: 'Құптан' },
  ar: { fajr: 'الفجر', dhuhr: 'الظهر', asr: 'العصر', maghrib: 'المغرب', isha: 'العشاء' },
};

export const normalizeLang = (l) => (LANGS.includes(l) ? l : 'ru');

export function t(lang, key, params = {}) {
  const s = DICT[normalizeLang(lang)][key] ?? DICT.ru[key];
  if (s === undefined) return key;
  return s.replace(/\{(\w+)\}/g, (_, k) => params[k] ?? '');
}

export const prayerName = (lang, prayer) => PRAYERS[normalizeLang(lang)][prayer] ?? prayer;

export function daysLabel(lang, n) {
  const l = normalizeLang(lang);
  if (l === 'kk') return 'күн';
  if (l === 'ar') {
    if (n === 1) return 'يوم';
    if (n === 2) return 'يومان';
    if (n >= 3 && n <= 10) return 'أيام';
    return 'يومًا';
  }
  return daysWord(n);
}
