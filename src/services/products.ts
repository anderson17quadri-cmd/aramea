import { toDataError } from './errors';
import { supabase, supabaseConfigured, TABLES } from './supabase';
import { Product } from '../types';

function fromRow(row: Record<string, unknown>): Product {
  return {
    id: row.id as string,
    name: row.name as string,
    category: (row.category as string) || null,
    createdAt: row.created_at as string,
  };
}

export async function getAllProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from(TABLES.products)
    .select('*')
    .order('category', { ascending: true, nullsFirst: false })
    .order('name', { ascending: true });
  if (error) throw toDataError(error, 'carregar os produtos');
  return (data ?? []).map((r) => fromRow(r as Record<string, unknown>));
}

export async function createProduct(name: string, category: string): Promise<void> {
  const { error } = await supabase.from(TABLES.products).insert({ name: name.trim(), category: category.trim() || null });
  if (error) throw toDataError(error, 'adicionar o produto');
}

export async function updateProduct(id: string, name: string, category: string | null): Promise<void> {
  const { error } = await supabase
    .from(TABLES.products)
    .update({ name: name.trim(), category: category?.trim() || null })
    .eq('id', id);
  if (error) throw toDataError(error, 'guardar o produto');
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase.from(TABLES.products).delete().eq('id', id);
  if (error) throw toDataError(error, 'excluir o produto');
}

/** Realtime: avisa sempre que a tabela products muda. Devolve o cleanup. */
export function subscribeProducts(onChange: () => void): () => void {
  if (!supabaseConfigured) return () => {};
  try {
    const channel = supabase
      .channel(`products-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.products }, () => onChange())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  } catch {
    return () => {};
  }
}
