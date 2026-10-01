import { describe, it, expect } from 'vitest';
import { needsAutostart } from '../../src/main/autostart.js';

describe('needsAutostart', () => {
  it('не установленное приложение — не трогаем', () => {
    expect(needsAutostart({ packaged: false, settings: {}, exePath: 'a' })).toBe(false);
  });
  it('первый запуск — регистрируем', () => {
    expect(needsAutostart({ packaged: true, settings: {}, exePath: 'a' })).toBe(true);
  });
  it('путь тот же — ничего не делаем', () => {
    expect(needsAutostart({ packaged: true, settings: { autostartPath: 'a' }, exePath: 'a' })).toBe(false);
  });
  it('приложение переехало (переустановка) — регистрируем заново', () => {
    expect(needsAutostart({ packaged: true, settings: { autostartPath: 'a' }, exePath: 'b' })).toBe(true);
  });
});
