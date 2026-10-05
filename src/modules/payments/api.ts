import { fetchAttentionById, fetchOrderedProductsByAttention, isAttentionActive, BusinessRuleError } from '@/modules/orders/api'
import { computeAccount } from '@/modules/payments/account'
import type {
  CreatePaymentPayload,
  Payment,
  PaymentAllocation,
  PaymentMethod,
  PaymentStatus,
} from '@/modules/payments/types'
import { http } from '@/services/http'
import { MONEY_EPSILON, roundMoney } from '@/utils/money'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export const PAYMENT_METHODS: readonly PaymentMethod[] = ['cash', 'card', 'yape', 'plin', 'transfer', 'other']
const STATUSES: readonly PaymentStatus[] = ['pending', 'processing', 'paid', 'failed', 'cancelled', 'refunded']

function isPaymentMethod(value: unknown): value is PaymentMethod {
  return typeof value === 'string' && (PAYMENT_METHODS as readonly string[]).includes(value)
}

function isPaymentStatus(value: unknown): value is PaymentStatus {
  return typeof value === 'string' && (STATUSES as readonly string[]).includes(value)
}

function isAllocation(value: unknown): value is PaymentAllocation {
  return (
    isRecord(value) &&
    (typeof value.orderedProductId === 'string' || typeof value.orderedProductId === 'number') &&
    typeof value.amount === 'number'
  )
}

function isPayment(value: unknown): value is Payment {
  if (!isRecord(value)) {
    return false
  }

  const payerName = value.payerName
  const processedBy = value.processedByEmployeeName
  const externalReference = value.externalReference

  return (
    (typeof value.id === 'string' || typeof value.id === 'number') &&
    (typeof value.attentionId === 'string' || typeof value.attentionId === 'number') &&
    typeof value.amount === 'number' &&
    isPaymentMethod(value.method) &&
    isPaymentStatus(value.status) &&
    (payerName === null || typeof payerName === 'string') &&
    (processedBy === null || typeof processedBy === 'string') &&
    (externalReference === null || externalReference === undefined || typeof externalReference === 'string') &&
    typeof value.createdAt === 'string'
  )
}

function toPayment(value: Payment): Payment {
  const allocations = Array.isArray(value.allocations)
    ? value.allocations.filter(isAllocation).map((item) => ({ ...item, orderedProductId: String(item.orderedProductId) }))
    : []

  return {
    ...value,
    id: String(value.id),
    attentionId: String(value.attentionId),
    allocations,
    orderedProductIds: allocations.map((item) => item.orderedProductId),
    externalReference: value.externalReference ?? null,
    requestId: typeof value.requestId === 'string' ? value.requestId : null,
  }
}

export async function fetchAllPayments(): Promise<Payment[]> {
  const payload = await http<unknown>('/payments')

  if (!Array.isArray(payload)) {
    return []
  }

  return payload
    .filter(isPayment)
    .map(toPayment)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}

export async function fetchPaymentsByAttention(attentionId: string): Promise<Payment[]> {
  return (await fetchAllPayments()).filter((payment) => payment.attentionId === attentionId)
}

/**
 * Registra un pago validando contra el estado actual en el servidor:
 * no supera el saldo pendiente, ni lo pendiente de cada producto asignado,
 * y un reintento con el mismo `requestId` no duplica el pago.
 */
export async function createPayment(draft: CreatePaymentPayload): Promise<Payment> {
  const duplicated = await http<unknown>(`/payments?requestId=${encodeURIComponent(draft.requestId)}`)

  if (Array.isArray(duplicated)) {
    const existing = duplicated.find(isPayment)

    if (existing) {
      return toPayment(existing)
    }
  }

  const amount = roundMoney(draft.amount)

  if (amount <= 0) {
    throw new BusinessRuleError('El monto debe ser mayor que cero.')
  }

  const attention = await fetchAttentionById(draft.attentionId)

  if (!attention || !isAttentionActive(attention)) {
    throw new BusinessRuleError('La atención ya está cerrada o cancelada.')
  }

  const [products, payments] = await Promise.all([
    fetchOrderedProductsByAttention(draft.attentionId),
    fetchPaymentsByAttention(draft.attentionId),
  ])
  const account = computeAccount(products, payments)

  if (draft.status === 'paid' && amount > account.remaining + MONEY_EPSILON) {
    throw new BusinessRuleError('El monto supera el saldo pendiente de la cuenta.')
  }

  let allocated = 0

  for (const allocation of draft.allocations) {
    const balance = account.products.find((item) => item.product.id === allocation.orderedProductId)

    if (!balance) {
      throw new BusinessRuleError('Uno de los productos no se puede cobrar (rechazado o cancelado).')
    }

    if (allocation.amount > balance.pending + MONEY_EPSILON) {
      throw new BusinessRuleError(`No se puede asignar a "${balance.product.name}" más de lo que tiene pendiente.`)
    }

    allocated += allocation.amount
  }

  if (draft.allocations.length > 0 && Math.abs(roundMoney(allocated) - amount) > MONEY_EPSILON) {
    throw new BusinessRuleError('La suma asignada a los productos no coincide con el monto del pago.')
  }

  const payload = await http<unknown>('/payments', {
    method: 'POST',
    body: {
      ...draft,
      amount,
      orderedProductIds: draft.allocations.map((item) => item.orderedProductId),
      createdAt: new Date().toISOString(),
    },
  })

  if (!isPayment(payload)) {
    throw new Error('No se pudo registrar el pago.')
  }

  return toPayment(payload)
}

const PAYMENT_TRANSITIONS: Record<PaymentStatus, readonly PaymentStatus[]> = {
  pending: ['processing', 'paid', 'failed', 'cancelled'],
  processing: ['paid', 'failed', 'cancelled'],
  paid: ['refunded'],
  failed: [],
  cancelled: [],
  refunded: [],
}

export function nextPaymentStatuses(status: PaymentStatus): readonly PaymentStatus[] {
  return PAYMENT_TRANSITIONS[status]
}

export async function updatePaymentStatus(payment: Payment, status: PaymentStatus): Promise<Payment> {
  if (!PAYMENT_TRANSITIONS[payment.status].includes(status)) {
    throw new BusinessRuleError('Ese cambio de estado del pago no está permitido.')
  }

  if (status === 'paid') {
    const [products, payments] = await Promise.all([
      fetchOrderedProductsByAttention(payment.attentionId),
      fetchPaymentsByAttention(payment.attentionId),
    ])

    if (payment.amount > computeAccount(products, payments).remaining + MONEY_EPSILON) {
      throw new BusinessRuleError('Confirmar este pago superaría el saldo pendiente.')
    }
  }

  const payload = await http<unknown>(`/payments/${payment.id}`, { method: 'PATCH', body: { status } })

  if (!isPayment(payload)) {
    throw new Error('No se pudo actualizar el pago.')
  }

  return toPayment(payload)
}

export const paymentMethodLabel: Record<PaymentMethod, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  yape: 'Yape',
  plin: 'Plin',
  other: 'Otro',
}

export const paymentStatusLabel: Record<PaymentStatus, string> = {
  pending: 'Pendiente',
  processing: 'Procesando',
  paid: 'Pagado',
  failed: 'Fallido',
  cancelled: 'Cancelado',
  refunded: 'Reembolsado',
}

export const paymentStatusBadgeClass: Record<PaymentStatus, string> = {
  pending: 'bg-secondary-container text-on-secondary-container',
  processing: 'bg-primary-fixed text-on-primary-fixed',
  paid: 'bg-emerald-100 text-emerald-800',
  failed: 'bg-error-container text-on-error-container',
  cancelled: 'bg-surface-container-high text-on-surface-variant',
  refunded: 'bg-tertiary-fixed text-on-tertiary-container',
}
