export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'yape' | 'plin' | 'other'

export type PaymentStatus = 'pending' | 'processing' | 'paid' | 'failed' | 'cancelled' | 'refunded'

/** Parte del pago aplicada a un producto concreto (permite pagar productos específicos o una fracción). */
export interface PaymentAllocation {
  orderedProductId: string
  amount: number
}

export interface Payment {
  id: string
  attentionId: string
  orderedProductIds: string[]
  allocations: PaymentAllocation[]
  amount: number
  method: PaymentMethod
  status: PaymentStatus
  payerName: string | null
  processedByEmployeeName: string | null
  externalReference: string | null
  createdAt: string
  /** Clave de idempotencia del registro (evita pagos duplicados por reintentos). */
  requestId: string | null
}

export interface CreatePaymentPayload {
  attentionId: string
  allocations: PaymentAllocation[]
  amount: number
  method: PaymentMethod
  status: PaymentStatus
  payerName: string | null
  processedByEmployeeName: string | null
  externalReference: string | null
  requestId: string
}
