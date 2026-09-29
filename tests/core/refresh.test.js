import { describe, it, expect, vi } from 'vitest';
import { startRefresh } from '../../src/core/refresh.js';

describe('startRefresh', () => {
  it('обновляет сразу и раз в everyMs', async () => {
    vi.useFakeTimers();
    const refresh = vi.fn(async () => true);
    const stop = startRefresh({ refresh, isMissing: () => false, everyMs: 5 * 3600e3, retryMs: 60e3 });
    expect(refresh).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(5 * 3600e3);
    expect(refresh).toHaveBeenCalledTimes(2);
    stop();
    vi.useRealTimers();
  });
  it('если данных нет, повторяет раз в минуту', async () => {
    vi.useFakeTimers();
    const refresh = vi.fn(async () => false);
    const stop = startRefresh({ refresh, isMissing: () => true, everyMs: 5 * 3600e3, retryMs: 60e3 });
    await vi.advanceTimersByTimeAsync(3 * 60e3);
    expect(refresh.mock.calls.length).toBeGreaterThanOrEqual(4);
    stop();
    vi.useRealTimers();
  });
});
