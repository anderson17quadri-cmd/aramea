import { Order } from '../types';

export interface FinanceBucket {
  key: string;
  label: string;
  count: number;
  revenue: number;
}

export interface FinanceSummary {
  /** Receita de tudo o que está marcado para o mês. */
  revenue: number;
  /** Dinheiro que entrou de facto (sinais + encomendas liquidadas). */
  received: number;
  /** Dinheiro ainda por cobrar. */
  pending: number;
  cost: number;
  profit: number;
  /** Margem em percentagem; null quando não há receita. */
  marginPct: number | null;
  missingCost: number;
  missingPrice: number;
  debtors: Array<{ id: string; clientName: string; deliveryDate: string; owed: number }>;
  orderCount: number;
  /** Total de peças feitas à mão no mês. */
  pieces: number;
  averageTicket: number;
  bestDay: { date: string; revenue: number } | null;
  byCategory: FinanceBucket[];
  byChannel: FinanceBucket[];
  byStatus: FinanceBucket[];
  topClients: FinanceBucket[];
  /** Produtos mais pedidos — `count` é a quantidade de peças. */
  topProducts: FinanceBucket[];
  daily: Array<{ day: number; revenue: number }>;
}

function sortByRevenue(map: Map<string, FinanceBucket>): FinanceBucket[] {
  return [...map.values()].sort((a, b) => b.revenue - a.revenue);
}

export function summarise(orders: Order[], year: number, month: number): FinanceSummary {
  const daysInMonth = new Date(year, month, 0).getDate();
  const daily = Array.from({ length: daysInMonth }, (_, i) => ({ day: i + 1, revenue: 0 }));

  const categories = new Map<string, FinanceBucket>();
  const channels = new Map<string, FinanceBucket>();
  const statuses = new Map<string, FinanceBucket>();
  const clients = new Map<string, FinanceBucket>();
  const products = new Map<string, FinanceBucket>();

  let revenue = 0;
  let received = 0;
  let cost = 0;
  let pieces = 0;
  let missingPrice = 0;
  let missingCost = 0;
  const debtors: FinanceSummary['debtors'] = [];

  const add = (map: Map<string, FinanceBucket>, key: string, label: string, value: number, count = 1) => {
    const cur = map.get(key) ?? { key, label, count: 0, revenue: 0 };
    cur.count += count;
    cur.revenue += value;
    map.set(key, cur);
  };

  for (const o of orders) {
    const price = Math.max(0, o.price ?? 0);
    revenue += price;
    if (price <= 0) missingPrice += 1;
    cost += o.cost ?? 0;
    if (!o.cost) missingCost += 1;
    pieces += o.quantity ?? 0;

    received += o.paid ? price : Math.min(o.deposit ?? 0, price);
    const owed = o.paid ? 0 : Math.max(0, price - (o.deposit ?? 0));
    if (owed > 0) debtors.push({ id: o.id, clientName: o.clientName, deliveryDate: o.deliveryDate, owed });

    const day = parseInt(o.deliveryDate?.split('-')[2] ?? '', 10);
    const slot = daily[day - 1];
    if (slot) slot.revenue += price;

    // Preço dos produtos repartido pelas categorias, na proporção das peças.
    const totalQty = o.items.reduce((s, i) => s + i.qty, 0);
    const byCat = new Map<string, number>();
    for (const item of o.items) {
      const cat = item.category || 'Sem categoria';
      byCat.set(cat, (byCat.get(cat) ?? 0) + item.qty);
      add(products, item.productId || item.name, item.name, 0, item.qty);
    }
    for (const [cat, qty] of byCat) {
      add(categories, cat, cat, totalQty ? (o.productsPrice * qty) / totalQty : 0);
    }
    if (o.especial) add(categories, 'Especial', 'Especial', o.especialPrice ?? 0);

    const ch = o.sourceChannel || 'Outro';
    add(channels, ch, ch, price);
    const st = o.status || 'Pendente';
    add(statuses, st, st, price);
    const name = (o.clientName ?? '').trim();
    if (name) add(clients, name.toLowerCase(), name, price);
  }

  const bestDay = daily.reduce<{ date: string; revenue: number } | null>((best, d) => {
    if (d.revenue <= 0) return best;
    if (best && best.revenue >= d.revenue) return best;
    return { date: `${String(d.day).padStart(2, '0')}/${String(month).padStart(2, '0')}`, revenue: d.revenue };
  }, null);

  const priced = orders.length - missingPrice;
  debtors.sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate));

  return {
    revenue,
    received,
    pending: revenue - received,
    cost,
    profit: revenue - cost,
    marginPct: revenue > 0 ? ((revenue - cost) / revenue) * 100 : null,
    missingCost,
    missingPrice,
    debtors,
    orderCount: orders.length,
    pieces,
    averageTicket: priced > 0 ? revenue / priced : 0,
    bestDay,
    byCategory: sortByRevenue(categories),
    byChannel: sortByRevenue(channels),
    byStatus: [...statuses.values()].sort((a, b) => b.count - a.count),
    topClients: sortByRevenue(clients).slice(0, 5),
    topProducts: [...products.values()].sort((a, b) => b.count - a.count).slice(0, 5),
    daily,
  };
}
