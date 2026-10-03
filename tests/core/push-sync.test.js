import { describe, it, expect } from 'vitest';
import { shouldSyncPush } from '../../src/core/push-sync.js';

describe('shouldSyncPush', () => {
  it('разрешено и не выключено кнопкой — восстанавливаем', () => {
    expect(shouldSyncPush({ supported: true, permission: 'granted', optedOut: false })).toBe(true);
  });
  it('пользователь выключил кнопкой — не включаем сами', () => {
    expect(shouldSyncPush({ supported: true, permission: 'granted', optedOut: true })).toBe(false);
  });
  it('без разрешения или поддержки — ничего не делаем и не просим разрешение', () => {
    expect(shouldSyncPush({ supported: true, permission: 'default', optedOut: false })).toBe(false);
    expect(shouldSyncPush({ supported: true, permission: 'denied', optedOut: false })).toBe(false);
    expect(shouldSyncPush({ supported: false, permission: 'granted', optedOut: false })).toBe(false);
  });
});
