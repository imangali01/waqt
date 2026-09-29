import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { nameOfDay } from '../../src/core/names.js';

const names = [{ index: 1 }, { index: 2 }, { index: 3 }];

describe('nameOfDay', () => {
  it('один и тот же для даты, циклически по дню года', () => {
    expect(nameOfDay(names, '2026-01-01')).toBe(names[0]);
    expect(nameOfDay(names, '2026-01-02')).toBe(names[1]);
    expect(nameOfDay(names, '2026-01-04')).toBe(names[0]);
    expect(nameOfDay(names, '2026-01-02')).toBe(nameOfDay(names, '2026-01-02'));
  });
  it('пустой список — null', () => {
    expect(nameOfDay([], '2026-01-01')).toBeNull();
  });
});

describe('assets/names.json', () => {
  const all = JSON.parse(fs.readFileSync(new URL('../../assets/names.json', import.meta.url), 'utf8'));
  it('99 имён с арабским написанием, переводом и описанием', () => {
    expect(all).toHaveLength(99);
    for (const n of all) {
      expect(n.arabic).toMatch(/[\u0600-\u06FF]/);
      expect(n.translit.length).toBeGreaterThan(0);
      expect(n.translation.length).toBeGreaterThan(0);
      expect(n.description.length).toBeGreaterThan(20);
    }
  });
});
