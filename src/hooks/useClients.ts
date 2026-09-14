import { useCallback, useEffect, useRef, useState } from 'react';
import * as db from '../services/clients';
import { errorMessage } from '../services/errors';
import { Client } from '../types';

export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(async (query?: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = query?.trim() ? await db.searchClients(query) : await db.getAllClients();
      if (mountedRef.current) setClients(data);
    } catch (e) {
      if (mountedRef.current) setError(errorMessage(e, 'Não foi possível carregar os clientes.'));
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  const remove = useCallback(async (id: string, query?: string) => {
    try {
      await db.deleteClient(id);
      await refresh(query);
    } catch (e) {
      setError(errorMessage(e, 'Não foi possível excluir o cliente.'));
    }
  }, [refresh]);

  return { clients, loading, error, refresh, remove };
}
