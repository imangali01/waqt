import { describe, it, expect } from 'vitest';
import { createData } from '../../src/core/data.js';

describe('createData', () => {
  it('подставляет значения по умолчанию и сохраняет', () => {
    let saved;
    const file = { read: () => ({ marks: { a: 1 } }), write: (x) => { saved = x; } };
    const store = createData(file);
    expect(store.data.marks).toEqual({ a: 1 });
    expect(store.data.tracked).toEqual({});
    expect(store.data.settings.autostartSet).toBe(false);
    store.data.marks = {};
    store.save();
    expect(saved.marks).toEqual({});
  });
});

import { createData as _cd } from '../../src/core/data.js';
describe('viewMode по умолчанию', () => {
  it('полный вид', () => {
    expect(_cd({ read: (d) => d, write() {} }).data.settings.viewMode).toBe('full');
  });
});
