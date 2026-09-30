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

import { viewSize, normalizeViewMode } from '../../src/core/window-state.js';

describe('viewSize / normalizeViewMode', () => {
  it('полный вид 200x200, компактный 200x100', () => {
    expect(viewSize('full')).toEqual({ width: 200, height: 200 });
    expect(viewSize('compact')).toEqual({ width: 200, height: 100 });
  });
  it('неизвестный режим — полный', () => {
    expect(normalizeViewMode('bogus')).toBe('full');
    expect(normalizeViewMode(undefined)).toBe('full');
    expect(normalizeViewMode('compact')).toBe('compact');
  });
  it('clampToDisplays учитывает высоту компактного окна', () => {
    expect(clampToDisplays({ x: 100, y: 1000 }, displays, { width: 200, height: 100 })).toEqual({ x: 100, y: 940 });
  });
});

import { VIEW_MODES } from '../../src/core/window-state.js';

describe('дополнительные размеры', () => {
  it('средний 150x150, узкий 75x150', () => {
    expect(viewSize('medium')).toEqual({ width: 150, height: 150 });
    expect(viewSize('narrow')).toEqual({ width: 75, height: 150 });
  });
  it('порядок режимов для переключения', () => {
    expect(VIEW_MODES).toEqual(['full', 'compact', 'medium', 'narrow']);
    expect(normalizeViewMode('narrow')).toBe('narrow');
  });
});
