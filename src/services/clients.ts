import { toDataError } from './errors';
import { supabase, TABLES } from './supabase';
import { Client } from '../types';

function fromRow(row: Record<string, unknown>): Client {
  return {
    id: row.id as string,
    name: row.name as string,
    phone: (row.phone as string) ?? null,
    sourceChannel: (row.source_channel as string) ?? 'WhatsApp',
    notes: (row.notes as string) ?? null,
    createdAt: row.created_at as string,
  };
}

export async function getAllClients(): Promise<Client[]> {
  const { data, error } = await supabase.from(TABLES.clients).select('*').order('name', { ascending: true });
  if (error) throw toDataError(error, 'carregar os clientes');
  return (data ?? []).map((r) => fromRow(r as Record<string, unknown>));
}

export async function searchClients(query: string): Promise<Client[]> {
  const term = query.trim().replace(/[%_\\]/g, (c) => `\\${c}`);
  const { data, error } = await supabase
    .from(TABLES.clients)
    .select('*')
    .ilike('name', `%${term}%`)
    .order('name', { ascending: true });
  if (error) throw toDataError(error, 'procurar clientes');
  return (data ?? []).map((r) => fromRow(r as Record<string, unknown>));
}

// Os clientes são criados/atualizados automaticamente por um trigger no
// Postgres (sync_client_from_order) sempre que se grava uma encomenda.

export async function deleteClient(id: string): Promise<void> {
  const { error } = await supabase.from(TABLES.clients).delete().eq('id', id);
  if (error) throw toDataError(error, 'excluir o cliente');
}
