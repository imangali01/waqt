// Настройки Supabase: переменные окружения (.env) важнее файла supabase.config.json.
export function supabaseConfig(env, file) {
  const url = env.SUPABASE_URL || file?.url;
  const key = env.SUPABASE_PUBLISHABLE_KEY || file?.key;
  return url && key ? { url, key } : null;
}
