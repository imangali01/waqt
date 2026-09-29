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
