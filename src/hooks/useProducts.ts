import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { errorMessage } from '../services/errors';
import * as db from '../services/products';
import { Product } from '../types';

/**
 * Produtos do Supabase em tempo real: recarrega ao abrir o ecrã e sempre
 * que alguém adiciona/edita/apaga um produto (Realtime).
 */
export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    try {
      const data = await db.getAllProducts();
      if (mountedRef.current) {
        setProducts(data);
        setError(null);
      }
    } catch (e) {
      if (mountedRef.current) setError(errorMessage(e, 'Não foi possível carregar os produtos.'));
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  useEffect(() => db.subscribeProducts(refresh), [refresh]);

  /** Produtos agrupados por categoria, pela ordem alfabética. */
  const grouped = useMemo(() => {
    const map = new Map<string, Product[]>();
    for (const p of products) {
      const key = p.category?.trim() || 'Outros';
      map.set(key, [...(map.get(key) ?? []), p]);
    }
    return [...map.entries()].sort(([a], [b]) => (a === 'Outros' ? 1 : b === 'Outros' ? -1 : a.localeCompare(b)));
  }, [products]);

  const run = useCallback(async (fn: () => Promise<void>, fallback: string) => {
    try {
      await fn();
      await refresh();
      return true;
    } catch (e) {
      setError(errorMessage(e, fallback));
      return false;
    }
  }, [refresh]);

  const add = useCallback(
    (name: string, category: string) => run(() => db.createProduct(name, category), 'Não foi possível adicionar.'),
    [run],
  );
  const update = useCallback(
    (id: string, name: string, category: string | null) =>
      run(() => db.updateProduct(id, name, category), 'Não foi possível guardar.'),
    [run],
  );
  const remove = useCallback((id: string) => run(() => db.deleteProduct(id), 'Não foi possível excluir.'), [run]);

  return { products, grouped, loading, error, refresh, add, update, remove };
}
