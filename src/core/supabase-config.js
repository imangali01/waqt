// Настройки Supabase: переменные окружения (.env) важнее файла supabase.config.json.
export function supabaseConfig(env, file) {
  const url = env.SUPABASE_URL || file?.url;
  const key = env.SUPABASE_PUBLISHABLE_KEY || file?.key;
  return url && key ? { url, key } : null;
}

// Есть ли сохранённая сессия Supabase (без обращения к сети).
export function hasStoredSession(stored) {
  return Object.values(stored).some((v) => {
    try {
      const s = typeof v === 'string' ? JSON.parse(v) : v;
      return Boolean(s?.refresh_token);
    } catch {
      return false;
    }
  });
}
