import { useCallback, useEffect, useRef, useState } from 'react';
import * as db from '../services/database';
import { errorMessage } from '../services/errors';
import { cancelOrderNotification, syncReminders } from '../services/notifications';
import { brand, status as statusColors } from '../theme/colors';
import { MarkedDates, Order, OrderInput } from '../types';

export function useOrders() {
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fail = useCallback((e: unknown, fallback: string) => {
    if (mountedRef.current) setError(errorMessage(e, fallback));
  }, []);

  // Os getters não rebentam o ecrã: registam o erro para ser mostrado.
  // Devolver lista vazia em silêncio faria parecer que não há encomendas.
  const getByDate = useCallback(async (date: string) => {
    try {
      const result = await db.getOrdersByDate(date);
      if (mountedRef.current) setError(null);
      return result;
    } catch (e) {
      fail(e, 'Não foi possível carregar as encomendas do dia.');
      return [] as Order[];
    }
  }, [fail]);

  const getById = useCallback(async (id: string) => {
    try {
      return await db.getOrderById(id);
    } catch (e) {
      fail(e, 'Não foi possível abrir a encomenda.');
      return null;
    }
  }, [fail]);

  const getCounts = useCallback(async () => {
    try {
      // Fecha primeiro o que já passou da hora, para os números virem certos.
      await db.completeOverdueOrders().catch(() => 0);
      return await db.getActiveOrdersCount();
    } catch (e) {
      fail(e, 'Não foi possível carregar as encomendas.');
      return { pending: 0, production: 0 };
    }
  }, [fail]);

  const create = useCallback(async (data: OrderInput) => {
    const id = await db.createOrder(data);
    syncReminders();
    return id;
  }, []);

  const update = useCallback(async (id: string, data: Partial<OrderInput>) => {
    await db.updateOrder(id, data);
    syncReminders();
  }, []);

  const updateStatus = useCallback(async (id: string, status: string) => {
    await db.updateOrderStatus(id, status);
    if (status === 'Concluída' || status === 'Entregue') await cancelOrderNotification(id);
    syncReminders();
  }, []);

  const remove = useCallback(async (id: string) => {
    await db.deleteOrder(id);
    await cancelOrderNotification(id);
    syncReminders();
  }, []);

  const search = useCallback(async (query: string, statusFilter: string, dateFrom?: string, dateTo?: string) => {
    try {
      await db.completeOverdueOrders().catch(() => 0);
      const result = await db.searchOrders(query, statusFilter, dateFrom, dateTo);
      if (mountedRef.current) setError(null);
      return result;
    } catch (e) {
      fail(e, 'Não foi possível procurar encomendas.');
      return [] as Order[];
    }
  }, [fail]);

  const getMarkedDates = useCallback(async (year: number, month: number): Promise<MarkedDates> => {
    try {
      const data = await db.getMarkedDatesData(year, month);
      const marked: MarkedDates = {};
      for (const item of data) {
        const date = item.deliveryDate;
        if (!date) continue;
        const dots = marked[date]?.dots ?? [];
        if (dots.length < 3) {
          dots.push({
            key: `${date}-${dots.length}`,
            color: statusColors[item.status as keyof typeof statusColors] ?? brand.primary,
          });
        }
        marked[date] = { dots };
      }
      return marked;
    } catch (e) {
      fail(e, 'Não foi possível carregar o calendário.');
      return {};
    }
  }, [fail]);

  const clearError = useCallback(() => setError(null), []);

  return { error, clearError, getByDate, getById, getCounts, create, update, updateStatus, remove, search, getMarkedDates };
}
