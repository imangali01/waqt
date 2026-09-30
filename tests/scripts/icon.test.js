import { describe, it, expect } from 'vitest';
import { moonRgba } from '../../scripts/icon.js';

const px = (buf, size, x, y) => Array.from(buf.slice((y * size + x) * 4, (y * size + x) * 4 + 4));

describe('moonRgba', () => {
  const size = 128;
  const buf = moonRgba(size);
  const c = size / 2;

  it('возвращает RGBA нужной длины', () => {
    expect(buf.length).toBe(size * size * 4);
  });

  it('углы прозрачные', () => {
    expect(px(buf, size, 0, 0)[3]).toBe(0);
  });

  it('обод зелёный', () => {
    const [r, g, b, a] = px(buf, size, c, Math.round(size * 0.05));
    expect(a).toBe(255);
    expect(g).toBeGreaterThan(r);
    expect(g).toBeGreaterThan(b);
  });

  it('месяц зелёный, левая часть внутри — просвет, правая часть внутри — белая', () => {
    const [, g1, , a1] = px(buf, size, Math.round(c - size * 0.2), c);
    expect(a1).toBe(255);
    expect(g1).toBeLessThan(255 - 40); // зелёный, не белый
    const [r2, g2, b2] = px(buf, size, Math.round(c + size * 0.12), c);
    expect([r2, g2, b2]).toEqual([255, 255, 255]); // внутри выреза месяца
  });
});
