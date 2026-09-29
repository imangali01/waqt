import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createJsonFile } from '../../src/core/store.js';

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'waqt-'));

describe('createJsonFile', () => {
  it('нет файла — defaults', () => {
    const f = createJsonFile(path.join(tmp(), 'a.json'));
    expect(f.read({ x: 1 })).toEqual({ x: 1 });
  });
  it('пишет и читает', () => {
    const f = createJsonFile(path.join(tmp(), 'sub', 'a.json'));
    f.write({ y: 2 });
    expect(f.read({})).toEqual({ y: 2 });
  });
  it('повреждённый файл уходит в бэкап, возвращаются defaults', () => {
    const dir = tmp();
    const p = path.join(dir, 'a.json');
    fs.writeFileSync(p, '{oops');
    const f = createJsonFile(p);
    expect(f.read({ ok: true })).toEqual({ ok: true });
    expect(fs.readdirSync(dir).some((n) => n.startsWith('a.json.corrupt-'))).toBe(true);
  });
});
