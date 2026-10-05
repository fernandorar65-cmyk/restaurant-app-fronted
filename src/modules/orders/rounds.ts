import { attentionStatusLabel, orderedProductStatusLabel } from '@/modules/orders/order-status-labels'
import type { AttentionStatus, OrderedProduct, OrderedProductStatus, StatusHistoryEntry } from '@/modules/orders/types'

export interface OrderRound {
  batchId: string
  requestedAt: string
  /** Empleado que lo cargó; null si lo pidió el comensal por QR. */
  createdBy: string | null
  products: OrderedProduct[]
}

/** Agrupa los productos por ronda (cada envío del carrito o pedido manual), de la más antigua a la más reciente. */
export function groupByRound(products: OrderedProduct[]): OrderRound[] {
  const rounds = new Map<string, OrderRound>()

  for (const product of products) {
    const round = rounds.get(product.batchId)

    if (round) {
      round.products.push(product)
    } else {
      rounds.set(product.batchId, {
        batchId: product.batchId,
        requestedAt: product.requestedAt,
        createdBy: product.createdBy,
        products: [product],
      })
    }
  }

  return [...rounds.values()].sort((a, b) => (a.requestedAt < b.requestedAt ? -1 : 1))
}

/** Momento en que cada producto llegó a su estado actual, según el historial. */
export function statusSinceMap(history: StatusHistoryEntry[]): Map<string, string> {
  const since = new Map<string, string>()

  for (const entry of history) {
    if (entry.entityType === 'orderedProduct') {
      since.set(entry.entityId, entry.changedAt)
    }
  }

  return since
}

export function historyStatusLabel(entry: StatusHistoryEntry): string {
  if (entry.entityType === 'attention') {
    return attentionStatusLabel[entry.toStatus as AttentionStatus] ?? entry.toStatus
  }

  return orderedProductStatusLabel[entry.toStatus as OrderedProductStatus] ?? entry.toStatus
}

/** Minutos sin confirmar a partir de los cuales un pedido entrante se marca como demorado. */
export const INCOMING_DELAY_MINUTES = 5

/** Minutos en cocina a partir de los cuales una comanda se marca como demorada. */
export const KITCHEN_DELAY_MINUTES = 15

/** Minutos esperando en el pase a partir de los cuales una entrega se marca como demorada. */
export const DELIVERY_DELAY_MINUTES = 5
