import { describe, it, expect, vi } from 'vitest';
import { animateBounds } from '../../src/main/animate.js';

describe('animateBounds', () => {
  it('делает steps шагов и заканчивает в точке to', async () => {
    vi.useFakeTimers();
    const calls = [];
    const win = { setBounds: (b) => calls.push(b) };
    const p = animateBounds(win, { x: 0, y: 0, width: 200, height: 200 }, { x: 100, y: 50, width: 900, height: 600 }, { ms: 200, steps: 10 });
    await vi.advanceTimersByTimeAsync(300);
    await p;
    expect(calls).toHaveLength(10);
    expect(calls[9]).toEqual({ x: 100, y: 50, width: 900, height: 600 });
    expect(calls[0].width).toBeGreaterThan(200);
    vi.useRealTimers();
  });
});
