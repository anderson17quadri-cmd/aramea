import { supabaseConfigured } from './supabase';

/**
 * Erro de acesso a dados com uma mensagem que se pode mostrar no ecrã.
 * Uma falha de rede nunca pode parecer "não há encomendas".
 */
export class DataError extends Error {
  readonly offline: boolean;
  readonly original?: unknown;

  constructor(message: string, offline: boolean, original?: unknown) {
    super(message);
    this.name = 'DataError';
    this.offline = offline;
    this.original = original;
  }
}

function looksOffline(error: unknown): boolean {
  const e = error as { message?: string; code?: string } | null;
  const msg = (e?.message ?? '').toLowerCase();
  return msg.includes('network') || msg.includes('fetch') || msg.includes('timeout') || msg.includes('connection');
}

export function toDataError(error: unknown, acao: string): DataError {
  if (!supabaseConfigured) {
    return new DataError('Supabase por configurar — preenche o .env e o app.json.', false, error);
  }
  const offline = looksOffline(error);
  const message = offline ? 'Sem ligação à internet. Verifica a rede e tenta outra vez.' : `Não foi possível ${acao}.`;
  return new DataError(message, offline, error);
}

export function errorMessage(error: unknown, fallback = 'Ocorreu um erro inesperado.'): string {
  if (error instanceof DataError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  const maybe = error as { message?: string } | null;
  if (maybe?.message) return maybe.message;
  return fallback;
}
