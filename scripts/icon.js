// Иконка Waqt: зелёный обод с белым полем и зелёным полумесяцем внутри.
const GREEN = [0x2b, 0xa3, 0x6b];
const WHITE = [255, 255, 255];
const SS = 4; // суперсэмплинг для гладких краёв

// Цвет точки в долях размера (0..1) или null, если точка вне иконки.
function colorAt(u, v) {
  const dx = u - 0.5;
  const dy = v - 0.5;
  const d = Math.hypot(dx, dy);
  if (d > 0.47) return null;
  if (d > 0.4) return GREEN; // обод
  const inMoon = Math.hypot(dx + 0.03, dy) <= 0.27 && Math.hypot(dx - 0.1, dy) > 0.22;
  return inMoon ? GREEN : WHITE;
}

export function moonRgba(size) {
  const out = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0; let g = 0; let b = 0; let n = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const c = colorAt((x + (sx + 0.5) / SS) / size, (y + (sy + 0.5) / SS) / size);
          if (c) { r += c[0]; g += c[1]; b += c[2]; n++; }
        }
      }
      const o = (y * size + x) * 4;
      if (n) {
        out[o] = Math.round(r / n); out[o + 1] = Math.round(g / n); out[o + 2] = Math.round(b / n);
        out[o + 3] = Math.round((255 * n) / (SS * SS));
      }
    }
  }
  return out;
}
