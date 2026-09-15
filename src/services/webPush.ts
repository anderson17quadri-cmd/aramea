// No iPhone/Android nativo os lembretes são locais (notifications.ts) — nada a fazer aqui.
export type PushState = 'unsupported' | 'needs-install' | 'denied' | 'disabled' | 'enabled';

export function registerServiceWorker(): void {}

export async function getPushState(): Promise<PushState> {
  return 'unsupported';
}

export async function enablePush(): Promise<void> {}
