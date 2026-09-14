/** Um produto escolhido numa encomenda, com a quantidade. */
export interface OrderItem {
  productId: string;
  name: string;
  category: string | null;
  qty: number;
}

export interface Order {
  id: string;
  clientName: string;
  clientPhone: string | null;
  /** YYYY-MM-DD */
  deliveryDate: string;
  /** HH:MM */
  deliveryTime: string | null;
  /** Produtos com quantidade (coluna `items`, JSON). */
  items: OrderItem[];
  /** Resumo para relatórios e para quem lê a tabela à mão: ids separados por vírgula. */
  productId: string | null;
  /** Resumo legível: "3x Rosa, 1x Bouquet". */
  productName: string | null;
  /** Total de peças. */
  quantity: number;
  /** Preço dos produtos — soma-se ao especial para dar o total. */
  productsPrice: number;
  /** Encomenda personalizada, texto livre. */
  especial: string | null;
  especialPrice: number;
  /** Preço total = productsPrice + especialPrice. */
  price: number;
  /** Sinal já pago. */
  deposit: number;
  /** Custo do material, para calcular o lucro. */
  cost: number;
  paid: boolean;
  photoUri: string | null;
  sourceChannel: string;
  notes: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export type OrderInput = Omit<Order, 'id' | 'createdAt' | 'updatedAt'>;

export interface Client {
  id: string;
  name: string;
  phone: string | null;
  sourceChannel: string;
  notes: string | null;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  category: string | null;
  createdAt: string;
}

export interface MarkedDates {
  [date: string]: {
    dots?: Array<{ key: string; color: string }>;
    selected?: boolean;
    selectedColor?: string;
    selectedTextColor?: string;
  };
}

export type OrderStatus = 'Pendente' | 'Em Produção' | 'Concluída' | 'Entregue';
export type Channel = 'WhatsApp' | 'Instagram';

export const CHANNELS: Channel[] = ['WhatsApp', 'Instagram'];
export const STATUSES: OrderStatus[] = ['Pendente', 'Em Produção', 'Concluída', 'Entregue'];

export const DEFAULT_CATEGORIES = ['Flores', 'Bouquets', 'Arranjos', 'Vasos', 'Acessórios'];

/** Quanto falta receber desta encomenda. */
export function outstanding(order: Order): number {
  if (order.paid) return 0;
  return Math.max(0, (order.price ?? 0) - (order.deposit ?? 0));
}

/** Encomenda que ainda tem trabalho pela frente. */
export function isActive(order: Order): boolean {
  return order.status === 'Pendente' || order.status === 'Em Produção';
}

export function summarizeItems(items: OrderItem[]) {
  const valid = items.filter((i) => i.qty > 0);
  return {
    items: valid,
    productId: valid.length ? valid.map((i) => i.productId).join(',') : null,
    productName: valid.length ? valid.map((i) => `${i.qty}x ${i.name}`).join(', ') : null,
    quantity: valid.reduce((sum, i) => sum + i.qty, 0),
  };
}
