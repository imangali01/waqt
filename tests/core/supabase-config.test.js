import { describe, it, expect } from 'vitest';
import { supabaseConfig, hasStoredSession } from '../../src/core/supabase-config.js';

describe('supabaseConfig', () => {
  it('берёт из переменных окружения', () => {
    expect(supabaseConfig({ SUPABASE_URL: 'u', SUPABASE_PUBLISHABLE_KEY: 'k' }, null)).toEqual({ url: 'u', key: 'k' });
  });
  it('иначе из файла конфига', () => {
    expect(supabaseConfig({}, { url: 'u2', key: 'k2' })).toEqual({ url: 'u2', key: 'k2' });
  });
  it('переменные окружения важнее файла', () => {
    expect(supabaseConfig({ SUPABASE_URL: 'u', SUPABASE_PUBLISHABLE_KEY: 'k' }, { url: 'x', key: 'y' })).toEqual({ url: 'u', key: 'k' });
  });
  it('нет ни того ни другого — null', () => {
    expect(supabaseConfig({}, null)).toBeNull();
    expect(supabaseConfig({ SUPABASE_URL: 'u' }, {})).toBeNull();
  });
});

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
