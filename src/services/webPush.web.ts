import { supabase } from './supabase';

/** Chave pública VAPID (a privada está só nos Secrets do Supabase). */
const VAPID_PUBLIC_KEY = 'BDOayDjVteWnTmdeNua4pEErwcFnnCEMnKYHANgzGmrMckAqv9wjggIsNE8hAgq72oqa5X_bUoSETfULzZIo7Oo';
const BASE = '/aramea';

export type PushState = 'unsupported' | 'needs-install' | 'denied' | 'disabled' | 'enabled';

function base64UrlToUint8Array(value: string): Uint8Array {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const raw = atob((value + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

function hasSupport(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/** No iPhone as notificações só existem com a app aberta a partir do ecrã principal. */
function isInstalled(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia?.('(display-mode: standalone)').matches || nav.standalone === true;
}

function isIOS(): boolean {
  return /iPhone|iPad|iPod/.test(navigator.userAgent);
}

export function registerServiceWorker(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register(`${BASE}/sw.js`, { scope: `${BASE}/` }).catch(() => {});
}

export async function getPushState(): Promise<PushState> {
  if (typeof window === 'undefined') return 'unsupported';
  if (isIOS() && !isInstalled()) return 'needs-install';
  if (!hasSupport()) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  const reg = await navigator.serviceWorker.getRegistration(`${BASE}/`);
  const sub = await reg?.pushManager.getSubscription();
  return sub && Notification.permission === 'granted' ? 'enabled' : 'disabled';
}

/**
 * Pede autorização, regista este telemóvel no Supabase e envia uma
 * notificação de teste. Tem de ser chamado a partir de um toque.
 */
export async function enablePush(): Promise<void> {
  if (!hasSupport()) throw new Error('Este navegador não suporta notificações.');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Notificações não autorizadas. Ativa-as em Definições → Notificações → Araméa.');

  const reg = await navigator.serviceWorker.register(`${BASE}/sw.js`, { scope: `${BASE}/` });
  await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlToUint8Array(VAPID_PUBLIC_KEY) as BufferSource }));

  const json = sub.toJSON();
  const { error } = await supabase.rpc('aramea_save_push_subscription', {
    p_endpoint: json.endpoint,
    p_p256dh: json.keys?.p256dh,
    p_auth: json.keys?.auth,
    p_user_agent: navigator.userAgent.slice(0, 250),
  });
  if (error) throw new Error('Não foi possível registar este telemóvel.');

  await supabase.functions.invoke('aramea-push', { body: { test: true, endpoint: json.endpoint } }).catch(() => null);
}
