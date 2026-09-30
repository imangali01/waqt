import { describe, it, expect } from 'vitest';
import { supabaseConfig } from '../../src/core/config.js';

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
