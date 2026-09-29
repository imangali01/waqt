import { describe, it, expect } from 'vitest';
import { clampToDisplays } from '../../src/core/window-state.js';

const displays = [{ workArea: { x: 0, y: 0, width: 1920, height: 1040 } }];

describe('clampToDisplays', () => {
  it('нет сохранённой позиции — null', () => {
    expect(clampToDisplays(null, displays)).toBeNull();
  });
  it('позиция на экране — как есть', () => {
    expect(clampToDisplays({ x: 100, y: 200 }, displays)).toEqual({ x: 100, y: 200 });
  });
  it('экран отключён (позиция вне рабочих областей) — null', () => {
    expect(clampToDisplays({ x: 3000, y: 200 }, displays)).toBeNull();
  });
  it('окно почти вылезло за край, но видно — сдвигается внутрь', () => {
    expect(clampToDisplays({ x: 1800, y: 1000 }, displays)).toEqual({ x: 1720, y: 840 });
  });
});
