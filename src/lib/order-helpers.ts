import { Order, Product } from '@/lib/types';

/**
 * Calcula a quantidade total de sacos/itens em um pedido
 */
export function calcSacos(order: any): number {
  return order.items.reduce((s: number, i: any) => s + i.quantity, 0);
}

/**
 * Calcula o peso total de um pedido
 */
export function calcPeso(order: any): number {
  return order.totalWeight || 0;
}

/**
 * Calcula o valor total de um pedido
 */
export function calcValor(order: any): number {
  return order.totalValue || 0;
}

/**
 * Formata uma data para o padrão brasileiro
 */
export function formatDate(date: string | undefined, withTime = false): string {
  if (!date) return '---';
  try {
    const d = new Date(date);
    if (withTime) {
      return d.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    });
  } catch {
    return '---';
  }
}

/**
 * Agrupa um array de objetos por cidade
 */
export function groupByCity<T extends { city?: string }>(list: T[]): Record<string, T[]> {
  return list.reduce((acc, item) => {
    const city = item.city || 'Sem Cidade';
    if (!acc[city]) acc[city] = [];
    acc[city].push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

/**
 * Calcula o valor total de um array de pedidos
 */
export function calcTotalValue(orders: Order[]): number {
  return orders.reduce((acc, o) => acc + (o.totalValue || 0), 0);
}

/**
 * Calcula a quantidade total de sacos em um array de pedidos
 */
export function calcTotalSacos(orders: Order[]): number {
  return orders.reduce((acc, o) => acc + calcSacos(o), 0);
}

/**
 * Calcula o peso total de um array de pedidos
 */
export function calcTotalPeso(orders: Order[]): number {
  return orders.reduce((acc, o) => acc + calcPeso(o), 0);
}

/**
 * Calcula a quantidade total de unidades em um array de pedidos
 */
export function calcTotalQuantidade(orders: Order[]): number {
  return orders.reduce((acc, o) =>
    acc + (o.items || []).reduce((s, i) => s + i.quantity, 0), 0);
}
