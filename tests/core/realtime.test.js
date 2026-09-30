import { describe, it, expect, vi, afterEach } from 'vitest';
import { subscribeMarks } from '../../src/core/realtime.js';

function fakeClient() {
  const c = { handlers: [], removed: false, subscribed: false, topic: null };
  const channel = {
    on: (type, filter, cb) => { c.handlers.push({ type, filter, cb }); return channel; },
    subscribe: () => { c.subscribed = true; return channel; },
  };
  c.channel = (name) => { c.topic = name; return channel; };
  c.removeChannel = async () => { c.removed = true; };
  return c;
}

afterEach(() => vi.useRealTimers());

describe('subscribeMarks', () => {
  it('подписывается на изменения отметок только своего пользователя', () => {
    const client = fakeClient();
    subscribeMarks({ client, userId: 'u1', onChange: () => {} });
    expect(client.subscribed).toBe(true);
    expect(client.handlers[0]).toMatchObject({
      type: 'postgres_changes',
      filter: { event: '*', schema: 'public', table: 'prayer_marks', filter: 'user_id=eq.u1' },
    });
  });

  it('серия событий сливается в один вызов', () => {
    vi.useFakeTimers();
    const client = fakeClient();
    const onChange = vi.fn();
    subscribeMarks({ client, userId: 'u1', onChange, debounceMs: 300 });
    const fire = client.handlers[0].cb;
    fire({}); fire({}); fire({});
    expect(onChange).not.toHaveBeenCalled();
    vi.advanceTimersByTime(300);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('отписка снимает канал и гасит отложенный вызов', () => {
    vi.useFakeTimers();
    const client = fakeClient();
    const onChange = vi.fn();
    const off = subscribeMarks({ client, userId: 'u1', onChange, debounceMs: 300 });
    client.handlers[0].cb({});
    off();
    vi.advanceTimersByTime(1000);
    expect(client.removed).toBe(true);
    expect(onChange).not.toHaveBeenCalled();
  });
});
