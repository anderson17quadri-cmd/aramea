import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getOrdersBetween } from './database';
import { isActive, Order } from '../types';
import { addDays, todayISO } from '../utils/format';

const PREFIX = 'order-';
const CHANNEL_ID = 'entregas';
const EVE_HOUR = 21;
const FIRST_HOUR = 8;
/** Sem hora de entrega definida, conta como 18:00. */
const DEFAULT_TIME = '18:00';
/** O iPhone só guarda 64 notificações locais agendadas — ficamos abaixo disso. */
const MAX_SCHEDULED = 60;
const DAYS_AHEAD = 10;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestPermission(): Promise<boolean> {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Lembretes de entrega',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6E7262',
      });
    }
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    const asked = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowSound: true, allowBadge: false },
    });
    return asked.granted;
  } catch {
    return false;
  }
}

function localDate(dateISO: string, time: string): Date {
  const [y, m, d] = dateISO.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, h || 0, mi || 0, 0, 0);
}

/** Véspera às 21h + de hora em hora das 8h até à hora de entrega. */
export function reminderTimes(order: Order, now: Date = new Date()): Array<{ date: Date; kind: 'eve' | 'day' }> {
  const time = order.deliveryTime || DEFAULT_TIME;
  const due = localDate(order.deliveryDate, time);
  const out: Array<{ date: Date; kind: 'eve' | 'day' }> = [];

  const eve = localDate(order.deliveryDate, `${EVE_HOUR}:00`);
  eve.setDate(eve.getDate() - 1);
  if (eve > now) out.push({ date: eve, kind: 'eve' });

  for (let h = FIRST_HOUR; h <= 23; h++) {
    const t = localDate(order.deliveryDate, `${h}:00`);
    if (t > due) break;
    if (t > now) out.push({ date: t, kind: 'day' });
  }
  return out;
}

function describe(order: Order): string {
  if (order.productName) return order.productName;
  if (order.especial) return `Especial: ${order.especial}`;
  return 'encomenda';
}

export async function cancelOrderNotification(orderId: string): Promise<void> {
  try {
    const all = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      all
        .filter((n) => n.identifier.startsWith(`${PREFIX}${orderId}-`))
        .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
    );
  } catch {}
}

async function cancelAllOrderNotifications(): Promise<void> {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    all
      .filter((n) => n.identifier.startsWith(PREFIX))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

let syncing: Promise<void> | null = null;

/**
 * Reagenda todos os lembretes a partir da base de dados.
 *
 * Em vez de agendar encomenda a encomenda (e rebentar o limite de 64 do
 * iPhone com os avisos de hora em hora), olha para os próximos dias, junta
 * todos os avisos e fica com os mais próximos. Encomendas concluídas ou
 * entregues deixam de ter avisos automaticamente.
 */
export function syncReminders(): Promise<void> {
  if (syncing) return syncing;
  syncing = (async () => {
    try {
      const granted = await requestPermission();
      if (!granted) return;
      const today = todayISO();
      const orders = (await getOrdersBetween(today, addDays(today, DAYS_AHEAD))).filter(isActive);
      const now = new Date();
      const all = orders
        .flatMap((order) => reminderTimes(order, now).map((r) => ({ ...r, order })))
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .slice(0, MAX_SCHEDULED);

      await cancelAllOrderNotifications();
      for (const r of all) {
        const hora = r.order.deliveryTime ? ` às ${r.order.deliveryTime}` : '';
        await Notifications.scheduleNotificationAsync({
          identifier: `${PREFIX}${r.order.id}-${r.date.getTime()}`,
          content: {
            title: r.kind === 'eve' ? 'Entrega amanhã!' : `Entrega hoje${hora}`,
            body: `${r.order.clientName}${r.kind === 'eve' ? hora : ''} · ${describe(r.order)}`,
            data: { orderId: r.order.id },
            sound: true,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: r.date,
            channelId: CHANNEL_ID,
          },
        });
      }
    } catch {
      // Um lembrete que falha nunca pode impedir de guardar uma encomenda.
    } finally {
      syncing = null;
    }
  })();
  return syncing;
}

/** Ao tocar numa notificação, abre a encomenda. Devolve o cleanup. */
export function onNotificationTap(callback: (orderId: string) => void): () => void {
  const open = (response: Notifications.NotificationResponse | null | undefined) => {
    const id = response?.notification?.request?.content?.data?.orderId;
    if (typeof id === 'string') callback(id);
  };
  Notifications.getLastNotificationResponseAsync().then(open).catch(() => {});
  const sub = Notifications.addNotificationResponseReceivedListener(open);
  return () => sub.remove();
}
