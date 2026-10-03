// Edge Function: разовый тестовый web-push на все подписки пользователя (проверка, что доставка работает).
// Вызов защищён тем же CRON_SECRET, что и send-reminders (заголовок x-cron-secret).
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const env = (k: string) => Deno.env.get(k) ?? '';
const db = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'));
webpush.setVapidDetails(env('VAPID_SUBJECT'), env('VAPID_PUBLIC_KEY'), env('VAPID_PRIVATE_KEY'));

Deno.serve(async (req) => {
  if (!env('CRON_SECRET') || req.headers.get('x-cron-secret') !== env('CRON_SECRET')) {
    return new Response('forbidden', { status: 403 });
  }
  const { data: subs, error } = await db.from('push_subscriptions').select('*');
  if (error) return new Response(error.message, { status: 500 });

  const results: unknown[] = [];
  for (const s of subs ?? []) {
    try {
      const r = await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify({ title: 'Waqt: тест', body: 'Push доставляется', tag: 'waqt-test', url: env('APP_URL') || undefined }),
        { TTL: 60, urgency: 'high' },
      );
      results.push({ ok: true, status: r.statusCode });
    } catch (e) {
      results.push({ ok: false, status: (e as any).statusCode, body: String((e as any).body ?? e).slice(0, 200) });
    }
  }
  return Response.json({ subs: results.length, results });
});
