import { Order } from '../types';

export interface ProductionLine {
  key: string;
  label: string;
  category: string | null;
  qty: number;
  /** Clientes que pediram este produto. */
  clients: string[];
}

export interface ProductionPlan {
  date: string;
  orderCount: number;
  totalPieces: number;
  /** Produtos somados em todas as encomendas do dia. */
  products: ProductionLine[];
  /** Encomendas personalizadas, para ler uma a uma. */
  especiais: Array<{ id: string; clientName: string; especial: string; deliveryTime: string | null }>;
  /** Ordem das entregas ao longo do dia. */
  schedule: Array<{ id: string; clientName: string; deliveryTime: string | null; summary: string; status: string }>;
}

/**
 * Responde a "o que tenho de fazer neste dia?" sem abrir encomenda a
 * encomenda: as flores aparecem somadas por produto.
 */
export function buildProductionPlan(orders: Order[], date: string): ProductionPlan {
  const todo = orders.filter((o) => o.status !== 'Entregue');
  const map = new Map<string, ProductionLine>();

  for (const o of todo) {
    for (const item of o.items) {
      const key = item.productId || item.name;
      const line = map.get(key) ?? { key, label: item.name, category: item.category, qty: 0, clients: [] };
      line.qty += item.qty;
      const name = (o.clientName ?? '').trim();
      if (name && !line.clients.includes(name)) line.clients.push(name);
      map.set(key, line);
    }
  }

  const products = [...map.values()].sort((a, b) => b.qty - a.qty);
  const byTime = (a: { deliveryTime: string | null }, b: { deliveryTime: string | null }) =>
    (a.deliveryTime ?? '99:99').localeCompare(b.deliveryTime ?? '99:99');

  return {
    date,
    orderCount: todo.length,
    totalPieces: products.reduce((s, l) => s + l.qty, 0),
    products,
    especiais: todo
      .filter((o) => o.especial)
      .map((o) => ({ id: o.id, clientName: o.clientName, especial: o.especial ?? '', deliveryTime: o.deliveryTime }))
      .sort(byTime),
    schedule: todo
      .map((o) => ({
        id: o.id,
        clientName: o.clientName,
        deliveryTime: o.deliveryTime,
        summary: o.productName || (o.especial ? `Especial: ${o.especial}` : '—'),
        status: o.status,
      }))
      .sort(byTime),
  };
}
