// Edge Function: раз в 30 секунд (pg_cron) шлёт web-push о времени намаза и напоминания,
// пока намаз не отмечен. Логика в общих модулях ./core (копия src/core, см. npm run functions:build).
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';
import { buildSnapshot } from './core/snapshot.js';
import { duePush, pushMessage } from './core/push.js';
import { addDays, dateOf } from './core/tz.js';
import { markKey } from './core/marks.js';

const env = (k: string) => Deno.env.get(k) ?? '';
const db = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'));
webpush.setVapidDetails(env('VAPID_SUBJECT'), env('VAPID_PUBLIC_KEY'), env('VAPID_PRIVATE_KEY'));

Deno.serve(async (req) => {
  if (!env('CRON_SECRET') || req.headers.get('x-cron-secret') !== env('CRON_SECRET')) {
    return new Response('forbidden', { status: 403 });
  }
  const now = new Date();
  const today = dateOf(now);
  const from = addDays(today, -1);
  const to = addDays(today, 1);

  const { data: subs, error } = await db.from('push_subscriptions').select('*');
  if (error) return new Response(error.message, { status: 500 });

  const byUser = new Map<string, any[]>();
  for (const s of subs ?? []) byUser.set(s.user_id, [...(byUser.get(s.user_id) ?? []), s]);

  let sentCount = 0;
  for (const [userId, userSubs] of byUser) {
    const [{ data: dayRows }, { data: markRows }, { data: sentRows }] = await Promise.all([
      db.from('prayer_days').select('date, times').eq('user_id', userId).gte('date', from).lte('date', to),
      db.from('prayer_marks').select('date, prayer, status, deleted').eq('user_id', userId).gte('date', from).lte('date', to),
      db.from('push_sent').select('key').eq('user_id', userId).gte('sent_at', new Date(now.getTime() - 36 * 3600e3).toISOString()),
    ]);

    const days: Record<string, any> = {};
    for (const r of dayRows ?? []) days[r.date] = r.times;
    // Времена на завтра появляются в базе только завтра, а окно Иши заканчивается по фаджру следующего дня:
    // до тех пор берём сегодняшние времена (расхождение — минуты).
    if (days[today] && !days[to]) days[to] = days[today];

    const marks: Record<string, any> = {};
    for (const m of markRows ?? []) marks[markKey(m.date, m.prayer)] = { status: m.status, deleted: m.deleted };

    const snap = buildSnapshot(days, marks, now);
    const due = duePush({ snap, sent: new Set((sentRows ?? []).map((r) => r.key)) });
    if (!due) continue;

    // Ключ фиксируем до отправки: лучше пропустить push, чем прислать дубль.
    const { error: dup } = await db.from('push_sent').insert({ user_id: userId, key: due.key });
    if (dup) continue;

    for (const s of userSubs) {
      const msg = pushMessage({ kind: due.kind, minutes: (due as any).minutes, prayer: snap.prayer, lang: s.lang });
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify({ ...msg, url: env('APP_URL') || undefined }),
          { TTL: 60, urgency: 'high' },
        );
        sentCount++;
      } catch (e) {
        // Подписка отозвана или устарела — убираем.
        if ((e as any).statusCode === 404 || (e as any).statusCode === 410) {
          await db.from('push_subscriptions').delete().eq('user_id', userId).eq('endpoint', s.endpoint);
        }
      }
    }
  }

  await db.from('push_sent').delete().lt('sent_at', new Date(now.getTime() - 3 * 24 * 3600e3).toISOString());
  return Response.json({ users: byUser.size, sent: sentCount });
});
