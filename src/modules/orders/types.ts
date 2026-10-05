export type AttentionStatus = 'open' | 'account-requested' | 'closed' | 'cancelled'

export interface Attention {
  id: string
  restaurantId: string
  tableNumber: string
  status: AttentionStatus
  openedAt: string
  closedAt: string | null
  guestName: string | null
  /** Cuenta de comensal que abrió la atención (null = invitado). */
  customerId: string | null
  cancellationReason: string | null
}

export type OrderedProductStatus =
  | 'sent'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'delivered'
  | 'rejected'
  | 'cancelled'

export interface OrderedProduct {
  id: string
  attentionId: string
  restaurantId: string
  productId: string
  name: string
  unitPrice: number
  quantity: number
  subtotal: number
  notes: string
  status: OrderedProductStatus
  rejectionReason: string | null
  requestedAt: string
  /** Ronda: todos los productos enviados juntos comparten el mismo batchId. */
  batchId: string
  /** Empleado que cargó el pedido manualmente (null = pedido por QR). */
  createdBy: string | null
  customerId: string | null
}

export interface OrderBatchOptions {
  /** Clave de idempotencia: reintentar con el mismo batchId no duplica productos. */
  batchId: string
  createdBy: string | null
  customerId: string | null
}

export interface NewOrderedProductInput {
  productId: string
  name: string
  unitPrice: number
  quantity: number
  notes: string
}

export interface AttentionWithProducts extends Attention {
  products: OrderedProduct[]
}

export type StatusHistoryEntityType = 'attention' | 'orderedProduct'

export interface StatusHistoryEntry {
  id: string
  entityType: StatusHistoryEntityType
  entityId: string
  fromStatus: string | null
  toStatus: string
  userName: string | null
  reason: string | null
  changedAt: string
}
