import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_KEY, AUTH_STORAGE_KEY } from './config.js';

// Один клиент на лендинг и на приложение: сессия хранится в localStorage этого сайта.
export const client = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: AUTH_STORAGE_KEY, detectSessionInUrl: false },
});

export async function signIn(email, password) {
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (!error) return { ok: true };
  return { ok: false, error: /invalid login/i.test(error.message) ? 'Неверный email или пароль' : error.message };
}

export const signOut = () => client.auth.signOut();
export const currentUser = async () => (await client.auth.getSession()).data.session?.user ?? null;
