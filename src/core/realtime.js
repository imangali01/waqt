// Живая синхронизация: Supabase Realtime сообщает об изменении отметок на другом устройстве,
// после чего вызывается onChange (обычно — обычная синхронизация syncOnce).
export function subscribeMarks({ client, userId, onChange, debounceMs = 300 }) {
  let timer;
  const channel = client
    .channel(`marks-${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'prayer_marks', filter: `user_id=eq.${userId}` },
      () => {
        clearTimeout(timer);
        timer = setTimeout(onChange, debounceMs);
      },
    )
    .subscribe();
  return () => {
    clearTimeout(timer);
    client.removeChannel(channel);
  };
}
