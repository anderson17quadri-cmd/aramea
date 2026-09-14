// Stub web: as notificações locais só existem no iPhone/Android.
import { Order } from '../types';

export async function requestPermission(): Promise<boolean> {
  return false;
}

export function reminderTimes(_order: Order, _now: Date = new Date()): Array<{ date: Date; kind: 'eve' | 'day' }> {
  return [];
}

export async function cancelOrderNotification(_orderId: string): Promise<void> {}

export async function syncReminders(): Promise<void> {}

export function onNotificationTap(_callback: (orderId: string) => void): () => void {
  return () => {};
}
