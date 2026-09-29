import { describe, it, expect } from 'vitest';
import { hasStoredSession } from '../../src/core/auth-state.js';

describe('hasStoredSession', () => {
  it('пусто — сессии нет', () => {
    expect(hasStoredSession({})).toBe(false);
  });
  it('сохранённая сессия с refresh_token — есть, даже если access_token просрочен', () => {
    const stored = { 'sb-x-auth-token': JSON.stringify({ access_token: 'a', refresh_token: 'r', expires_at: 1 }) };
    expect(hasStoredSession(stored)).toBe(true);
  });
  it('мусор вместо JSON — сессии нет', () => {
    expect(hasStoredSession({ k: '{oops' })).toBe(false);
    expect(hasStoredSession({ k: JSON.stringify({ access_token: 'a' }) })).toBe(false);
  });
});
