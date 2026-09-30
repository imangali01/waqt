const SIZES = {
  full: { w: 170, h: 170, name: 'Обычный' },
  compact: { w: 170, h: 85, name: 'Компактный' },
  medium: { w: 150, h: 150, name: 'Средний' },
  strip: { w: 150, h: 75, name: 'Полоса' },
};
const root = document.getElementById('sizes');

function render({ viewMode, modes }) {
  root.replaceChildren(...modes.map((m) => {
    const s = SIZES[m];
    const b = document.createElement('button');
    b.className = `size${m === viewMode ? ' on' : ''}`;
    b.innerHTML = '<span class="prev"><i></i></span>'
      + `<span class="name">${s.name}</span><span class="dim">${s.w}×${s.h}</span>`;
    // Инлайн-стили из HTML блокирует CSP, а через CSSOM можно.
    const box = b.querySelector('i');
    box.style.width = `${s.w * 0.5}px`;
    box.style.height = `${s.h * 0.5}px`;
    b.addEventListener('click', () => window.waqt.setView(m));
    return b;
  }));
}

let modes = [];
window.waqt.getSettings().then((s) => { modes = s.modes; render(s); });
window.waqt.onSettings((s) => render({ ...s, modes }));
