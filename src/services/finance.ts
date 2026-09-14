import { getOrdersByMonth } from './database';
import { FinanceSummary, summarise } from './financeMath';
import { Order } from '../types';

export * from './financeMath';

export interface FinanceReport {
  current: FinanceSummary;
  /** As encomendas do mês, para exportar sem as ir buscar outra vez. */
  orders: Order[];
  previousRevenue: number;
  /** Variação face ao mês anterior; null sem base de comparação. */
  changePct: number | null;
}

export async function getFinanceReport(year: number, month: number): Promise<FinanceReport> {
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;

  const [orders, prevOrders] = await Promise.all([getOrdersByMonth(year, month), getOrdersByMonth(prevYear, prevMonth)]);

  const current = summarise(orders, year, month);
  const previousRevenue = prevOrders.reduce((sum, o) => sum + (o.price ?? 0), 0);

  return {
    current,
    orders,
    previousRevenue,
    changePct: previousRevenue > 0 ? ((current.revenue - previousRevenue) / previousRevenue) * 100 : null,
  };
}
