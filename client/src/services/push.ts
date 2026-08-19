import { api } from './api';

let pushEnabled = false;

export async function setupPushNotifications(): Promise<{ enabled: boolean; reason?: string }> {
  if (pushEnabled) return { enabled: true };
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { enabled: false, reason: 'Push not supported in this browser' };
  }
  if (Notification.permission === 'denied') {
    return { enabled: false, reason: 'Notifications blocked in browser settings' };
  }
  try {
    const reg = await navigator.serviceWorker.ready;
    const { publicKey } = await api.vapidPublicKey();
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: publicKey
      });
    }
    await api.subscribePush(sub);
    pushEnabled = true;
    return { enabled: true };
  } catch (err) {
    return { enabled: false, reason: (err as Error).message };
  }
}

export async function removePushNotifications(): Promise<void> {
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) await sub.unsubscribe();
    await api.unsubscribePush();
  } catch {
    // ignore — server cleans up expired subscriptions
  }
  pushEnabled = false;
}