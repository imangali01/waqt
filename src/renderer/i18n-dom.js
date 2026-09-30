import { t, normalizeLang } from '../core/i18n.js';

let lang = 'ru';
export const getLang = () => lang;
export const tr = (key, params) => t(lang, key, params);

// Переводит разметку с data-i18n / data-i18n-title / data-i18n-ph и вызывает onChange для динамических частей.
export function initLang(onChange = () => {}) {
  const apply = (l) => {
    lang = normalizeLang(l);
    document.documentElement.lang = lang;
    for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = tr(el.dataset.i18n);
    for (const el of document.querySelectorAll('[data-i18n-title]')) el.title = tr(el.dataset.i18nTitle);
    for (const el of document.querySelectorAll('[data-i18n-ph]')) el.placeholder = tr(el.dataset.i18nPh);
    onChange(lang);
  };
  window.waqt.getSettings().then((s) => apply(s.lang));
  window.waqt.onLang(apply);
}
