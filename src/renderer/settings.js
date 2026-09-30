import { LANGS, LANG_NAMES } from '../core/i18n.js';
import { initLang, tr } from './i18n-dom.js';

const SIZES = {
  full: { w: 170, h: 170 },
  compact: { w: 170, h: 85 },
  medium: { w: 150, h: 150 },
  strip: { w: 150, h: 75 },
};
const sizesEl = document.getElementById('sizes');
const langsEl = document.getElementById('langs');
let state = { viewMode: 'full', modes: Object.keys(SIZES), lang: 'ru' };

function render() {
  sizesEl.replaceChildren(...state.modes.map((m) => {
    const s = SIZES[m];
    const b = document.createElement('button');
    b.className = `size${m === state.viewMode ? ' on' : ''}`;
    b.innerHTML = '<span class="prev"><i></i></span><span class="name"></span><span class="dim"></span>';
    // Инлайн-стили из HTML блокирует CSP, а через CSSOM можно.
    const box = b.querySelector('i');
    box.style.width = `${s.w * 0.5}px`;
    box.style.height = `${s.h * 0.5}px`;
    b.querySelector('.name').textContent = tr(`size.${m}`);
    b.querySelector('.dim').textContent = `${s.w}×${s.h}`;
    b.addEventListener('click', () => window.waqt.setView(m));
    return b;
  }));
  langsEl.replaceChildren(...LANGS.map((l) => {
    const b = document.createElement('button');
    b.className = `lang${l === state.lang ? ' on' : ''}`;
    b.textContent = LANG_NAMES[l];
    b.lang = l;
    b.addEventListener('click', () => window.waqt.setLang(l));
    return b;
  }));
}

window.waqt.getSettings().then((s) => { state = { ...state, ...s }; render(); });
window.waqt.onSettings((s) => { state = { ...state, ...s }; render(); });
initLang((l) => { state.lang = l; render(); });
