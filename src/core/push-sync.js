// Когда веб-версия сама восстанавливает push-подписку (в браузере и в таблице push_subscriptions).
// Подписка могла пропасть: iOS отозвал endpoint, строку удалила Edge Function (404/410), был сбой сети при включении.
// Восстанавливаем, только если уведомления разрешены и пользователь не выключал их кнопкой.
export function shouldSyncPush({ supported, permission, optedOut }) {
  return Boolean(supported) && permission === 'granted' && !optedOut;
}
