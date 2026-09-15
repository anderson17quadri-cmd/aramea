import { toDataError } from './errors';
import { supabase, TABLES } from './supabase';

const ORDERS = TABLES.orders;
import { Order, OrderInput, OrderItem } from '../types';

const statusToDb: Record<string, string> = {
  Pendente: 'pending',
  'Em Produção': 'in_production',
  Concluída: 'completed',
  Entregue: 'delivered',
};

const statusFromDb: Record<string, string> = {
  pending: 'Pendente',
  in_production: 'Em Produção',
  completed: 'Concluída',
  delivered: 'Entregue',
};

const FIELD_TO_COLUMN: Record<string, string> = {
  clientName: 'client_name',
  clientPhone: 'client_phone',
  deliveryDate: 'delivery_date',
  deliveryTime: 'delivery_time',
  items: 'items',
  productId: 'product_id',
  productName: 'product_name',
  quantity: 'quantity',
  productsPrice: 'products_price',
  especial: 'especial',
  especialPrice: 'especial_price',
  price: 'price',
  deposit: 'deposit',
  cost: 'cost',
  paid: 'paid',
  photoUri: 'photo_uri',
  sourceChannel: 'source_channel',
  notes: 'notes',
  status: 'status',
};

/**
 * Só as colunas dos campos enviados — um update que não mexe num campo
 * nunca o apaga na base de dados.
 */
function toRow(data: Partial<OrderInput>) {
  const row: Record<string, unknown> = {};
  for (const [field, column] of Object.entries(FIELD_TO_COLUMN)) {
    if (!(field in data)) continue;
    const value = (data as Record<string, unknown>)[field];
    row[column] = field === 'status' ? (statusToDb[value as string] ?? value) : value;
  }
  return row;
}

function parseItems(raw: unknown): OrderItem[] {
  const list = typeof raw === 'string' ? safeJson(raw) : raw;
  if (!Array.isArray(list)) return [];
  return list
    .map((i) => ({
      productId: String(i?.productId ?? ''),
      name: String(i?.name ?? 'Produto'),
      category: i?.category ? String(i.category) : null,
      qty: Number(i?.qty ?? 0) || 0,
    }))
    .filter((i) => i.qty > 0);
}

function safeJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return [];
  }
}

export function fromRow(row: Record<string, unknown>): Order {
  return {
    id: row.id as string,
    clientName: (row.client_name as string) ?? '',
    clientPhone: (row.client_phone as string) ?? null,
    deliveryDate: (row.delivery_date as string) ?? '',
    deliveryTime: (row.delivery_time as string) || null,
    items: parseItems(row.items),
    productId: (row.product_id as string) ?? null,
    productName: (row.product_name as string) ?? null,
    quantity: Number(row.quantity ?? 0),
    productsPrice: Number(row.products_price ?? 0),
    especial: (row.especial as string) || null,
    especialPrice: Number(row.especial_price ?? 0),
    price: Number(row.price ?? 0),
    deposit: Number(row.deposit ?? 0),
    cost: Number(row.cost ?? 0),
    paid: Boolean(row.paid),
    photoUri: (row.photo_uri as string) || null,
    sourceChannel: (row.source_channel as string) ?? 'WhatsApp',
    notes: (row.notes as string) || null,
    status: statusFromDb[row.status as string] ?? ((row.status as string) || 'Pendente'),
    createdAt: (row.created_at as string) ?? '',
    updatedAt: (row.updated_at as string) ?? '',
  };
}

const mapRows = (data: unknown[] | null) => (data ?? []).map((r) => fromRow(r as Record<string, unknown>));

export async function createOrder(data: OrderInput): Promise<string> {
  const { data: row, error } = await supabase.from(ORDERS).insert(toRow(data)).select('id').single();
  if (error) throw toDataError(error, 'guardar a encomenda');
  return (row as { id: string }).id;
}

export async function getOrderById(id: string): Promise<Order | null> {
  const { data, error } = await supabase.from(ORDERS).select('*').eq('id', id).maybeSingle();
  if (error) throw toDataError(error, 'abrir a encomenda');
  return data ? fromRow(data as Record<string, unknown>) : null;
}

export async function getOrdersByDate(date: string): Promise<Order[]> {
  const { data, error } = await supabase
    .from(ORDERS)
    .select('*')
    .eq('delivery_date', date)
    .order('delivery_time', { ascending: true, nullsFirst: false });
  if (error) throw toDataError(error, 'carregar as encomendas do dia');
  return mapRows(data);
}

export async function getOrdersBetween(from: string, to: string): Promise<Order[]> {
  const { data, error } = await supabase
    .from(ORDERS)
    .select('*')
    .gte('delivery_date', from)
    .lte('delivery_date', to)
    .order('delivery_date', { ascending: true })
    .order('delivery_time', { ascending: true, nullsFirst: false });
  if (error) throw toDataError(error, 'carregar as encomendas');
  return mapRows(data);
}

export async function getActiveOrdersCount(): Promise<{ pending: number; production: number }> {
  const { data, error } = await supabase.from(ORDERS).select('status').in('status', ['pending', 'in_production']);
  if (error) throw toDataError(error, 'carregar as encomendas');
  const rows = (data ?? []) as Array<{ status: string }>;
  return {
    pending: rows.filter((r) => r.status === 'pending').length,
    production: rows.filter((r) => r.status === 'in_production').length,
  };
}

export async function searchOrders(query: string, statusFilter?: string, dateFrom?: string, dateTo?: string): Promise<Order[]> {
  let q = supabase
    .from(ORDERS)
    .select('*')
    .order('delivery_date', { ascending: true })
    .order('delivery_time', { ascending: true, nullsFirst: false })
    .limit(500);

  const term = query?.trim().replace(/[%_\\]/g, (c) => `\\${c}`);
  if (term) q = q.ilike('client_name', `%${term}%`);
  if (statusFilter && statusFilter !== 'Todas') {
    const dbStatus = statusToDb[statusFilter];
    if (dbStatus) q = q.eq('status', dbStatus);
  }
  if (dateFrom) q = q.gte('delivery_date', dateFrom);
  if (dateTo) q = q.lte('delivery_date', dateTo);

  const { data, error } = await q;
  if (error) throw toDataError(error, 'procurar encomendas');
  return mapRows(data);
}

export async function getOrdersByMonth(year: number, month: number): Promise<Order[]> {
  const from = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const to = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return getOrdersBetween(from, to);
}

export async function updateOrder(id: string, data: Partial<OrderInput>): Promise<void> {
  const { error } = await supabase
    .from(ORDERS)
    .update({ ...toRow(data), updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw toDataError(error, 'guardar as alterações');
}

export async function updateOrderStatus(id: string, status: string): Promise<void> {
  const row: Record<string, unknown> = { status: statusToDb[status] ?? status, updated_at: new Date().toISOString() };
  // Concluída ou entregue presume-se liquidada — evita dívidas fantasma.
  if (status === 'Concluída' || status === 'Entregue') row.paid = true;
  const { error } = await supabase.from(ORDERS).update(row).eq('id', id);
  if (error) throw toDataError(error, 'alterar o estado');
}

/**
 * Marca como "Concluída" as encomendas cuja hora de entrega passou há mais
 * de 1 hora. Corre no Postgres (relógio único, fuso Europe/Lisbon).
 */
export async function completeOverdueOrders(): Promise<number> {
  const { data, error } = await supabase.rpc(TABLES.completeOverdueRpc);
  if (error) return 0;
  return typeof data === 'number' ? data : 0;
}

export async function deleteOrder(id: string): Promise<void> {
  const { error } = await supabase.from(ORDERS).delete().eq('id', id);
  if (error) throw toDataError(error, 'excluir a encomenda');
}

export async function getMarkedDatesData(year: number, month: number): Promise<Array<{ deliveryDate: string; status: string }>> {
  const from = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const to = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  const { data, error } = await supabase
    .from(ORDERS)
    .select('delivery_date, status')
    .gte('delivery_date', from)
    .lte('delivery_date', to);
  if (error) throw toDataError(error, 'carregar o calendário');
  return ((data ?? []) as Array<{ delivery_date: string; status: string }>).map((r) => ({
    deliveryDate: r.delivery_date,
    status: statusFromDb[r.status] ?? r.status,
  }));
}
