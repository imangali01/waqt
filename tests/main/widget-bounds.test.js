import { describe, it, expect } from 'vitest';
import { clampToDisplays } from '../../src/main/widget-bounds.js';

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

import { viewSize, normalizeViewMode } from '../../src/main/widget-bounds.js';

describe('viewSize / normalizeViewMode', () => {
  it('полный вид 170x170, компактный 170x85', () => {
    expect(viewSize('full')).toEqual({ width: 170, height: 170 });
    expect(viewSize('compact')).toEqual({ width: 170, height: 85 });
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

import { VIEW_MODES } from '../../src/main/widget-bounds.js';

describe('дополнительные размеры', () => {
  it('средний 150x150, полоса 150x75', () => {
    expect(viewSize('medium')).toEqual({ width: 150, height: 150 });
    expect(viewSize('strip')).toEqual({ width: 150, height: 75 });
  });
  it('порядок режимов для переключения', () => {
    expect(VIEW_MODES).toEqual(['full', 'compact', 'medium', 'strip']);
    expect(normalizeViewMode('strip')).toBe('strip');
  });
});
