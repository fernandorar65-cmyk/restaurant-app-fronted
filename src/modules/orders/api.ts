import { fetchMenuProducts } from '@/modules/menus/api'
import { canTransitionOrderedProduct, isBillableProduct } from '@/modules/orders/order-status-labels'
import { computeAccount } from '@/modules/payments/account'
import { fetchPaymentsByAttention } from '@/modules/payments/api'
import type {
  Attention,
  AttentionStatus,
  AttentionWithProducts,
  NewOrderedProductInput,
  OrderBatchOptions,
  OrderedProduct,
  OrderedProductStatus,
  StatusHistoryEntityType,
  StatusHistoryEntry,
} from '@/modules/orders/types'
import { fetchRestaurantById, fetchSiteOperation, isRestaurantOpen } from '@/modules/restaurants/api'
import { http, HttpError } from '@/services/http'
import { roundMoney } from '@/utils/money'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/** Un estado cambió en el servidor desde que se cargó la pantalla (otro empleado se adelantó). */
export class ConflictError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConflictError'
  }
}

/** Regla de negocio incumplida (mesa en mantenimiento, atención cerrada, etc.). */
export class BusinessRuleError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BusinessRuleError'
  }
}

export function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ConflictError || error instanceof BusinessRuleError || error instanceof HttpError) {
    return error.message
  }

  if (error instanceof TypeError) {
    return 'Sin conexión con el servidor. Revisa tu conexión e inténtalo de nuevo.'
  }

  return fallback
}

const ATTENTION_STATUSES: readonly AttentionStatus[] = ['open', 'account-requested', 'closed', 'cancelled']
const PRODUCT_STATUSES: readonly OrderedProductStatus[] = [
  'sent',
  'confirmed',
  'preparing',
  'ready',
  'delivered',
  'rejected',
  'cancelled',
]

function isAttentionStatus(value: unknown): value is AttentionStatus {
  return typeof value === 'string' && (ATTENTION_STATUSES as readonly string[]).includes(value)
}

function isOrderedProductStatus(value: unknown): value is OrderedProductStatus {
  return typeof value === 'string' && (PRODUCT_STATUSES as readonly string[]).includes(value)
}

function isAttention(value: unknown): value is Attention {
  if (!isRecord(value)) {
    return false
  }

  const closedAt = value.closedAt
  const guestName = value.guestName

  return (
    (typeof value.id === 'string' || typeof value.id === 'number') &&
    (typeof value.restaurantId === 'string' || typeof value.restaurantId === 'number') &&
    typeof value.tableNumber === 'string' &&
    isAttentionStatus(value.status) &&
    typeof value.openedAt === 'string' &&
    (closedAt === null || typeof closedAt === 'string') &&
    (guestName === null || typeof guestName === 'string')
  )
}

function toAttention(value: Attention): Attention {
  return {
    ...value,
    id: String(value.id),
    restaurantId: String(value.restaurantId),
    customerId: typeof value.customerId === 'string' ? value.customerId : null,
    cancellationReason: typeof value.cancellationReason === 'string' ? value.cancellationReason : null,
  }
}

function isOrderedProduct(value: unknown): value is OrderedProduct {
  if (!isRecord(value)) {
    return false
  }

  const rejectionReason = value.rejectionReason

  return (
    (typeof value.id === 'string' || typeof value.id === 'number') &&
    (typeof value.attentionId === 'string' || typeof value.attentionId === 'number') &&
    (typeof value.restaurantId === 'string' || typeof value.restaurantId === 'number') &&
    typeof value.productId === 'string' &&
    typeof value.name === 'string' &&
    typeof value.unitPrice === 'number' &&
    typeof value.quantity === 'number' &&
    typeof value.subtotal === 'number' &&
    typeof value.notes === 'string' &&
    isOrderedProductStatus(value.status) &&
    (rejectionReason === null || typeof rejectionReason === 'string') &&
    typeof value.requestedAt === 'string'
  )
}

function toOrderedProduct(value: OrderedProduct): OrderedProduct {
  return {
    ...value,
    id: String(value.id),
    attentionId: String(value.attentionId),
    restaurantId: String(value.restaurantId),
    batchId: typeof value.batchId === 'string' ? value.batchId : `batch-${value.attentionId}-${value.requestedAt}`,
    createdBy: typeof value.createdBy === 'string' ? value.createdBy : null,
    customerId: typeof value.customerId === 'string' ? value.customerId : null,
  }
}

function isStatusHistoryEntry(value: unknown): value is StatusHistoryEntry {
  if (!isRecord(value)) {
    return false
  }

  const fromStatus = value.fromStatus
  const userName = value.userName
  const reason = value.reason

  return (
    (typeof value.id === 'string' || typeof value.id === 'number') &&
    (value.entityType === 'attention' || value.entityType === 'orderedProduct') &&
    (typeof value.entityId === 'string' || typeof value.entityId === 'number') &&
    (fromStatus === null || typeof fromStatus === 'string') &&
    typeof value.toStatus === 'string' &&
    (userName === null || typeof userName === 'string') &&
    (reason === null || typeof reason === 'string') &&
    typeof value.changedAt === 'string'
  )
}

function toStatusHistoryEntry(value: StatusHistoryEntry): StatusHistoryEntry {
  return { ...value, id: String(value.id), entityId: String(value.entityId) }
}

// ── Atenciones ──────────────────────────────────────────────────────────

export async function fetchAllAttentions(): Promise<Attention[]> {
  const payload = await http<unknown>('/attentions')

  if (!Array.isArray(payload)) {
    return []
  }

  return payload
    .filter(isAttention)
    .map(toAttention)
    .sort((a, b) => (a.openedAt < b.openedAt ? 1 : -1))
}

export async function fetchAttentionsBySite(restaurantId: string): Promise<Attention[]> {
  return (await fetchAllAttentions()).filter((attention) => attention.restaurantId === restaurantId)
}

export async function fetchAttentionsByCustomer(customerId: string): Promise<Attention[]> {
  return (await fetchAllAttentions()).filter((attention) => attention.customerId === customerId)
}

export async function fetchAttentionById(id: string): Promise<Attention | null> {
  try {
    const payload = await http<unknown>(`/attentions/${id}`)
    return isAttention(payload) ? toAttention(payload) : null
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) {
      return null
    }

    throw error
  }
}

export function isAttentionActive(attention: Attention): boolean {
  return attention.status === 'open' || attention.status === 'account-requested'
}

export async function fetchOpenAttentionForTable(
  restaurantId: string,
  tableNumber: string,
): Promise<Attention | null> {
  const attentions = await fetchAttentionsBySite(restaurantId)
  const active = attentions
    .filter((attention) => attention.tableNumber === tableNumber && isAttentionActive(attention))
    .sort((a, b) => (a.openedAt < b.openedAt ? -1 : 1))

  return active[0] ?? null
}

async function createAttention(
  restaurantId: string,
  tableNumber: string,
  options: { guestName?: string | null; customerId?: string | null; userName?: string | null },
): Promise<Attention> {
  const payload = await http<unknown>('/attentions', {
    method: 'POST',
    body: {
      restaurantId,
      tableNumber,
      status: 'open',
      openedAt: new Date().toISOString(),
      closedAt: null,
      guestName: options.guestName ?? null,
      customerId: options.customerId ?? null,
      cancellationReason: null,
    },
  })

  if (!isAttention(payload)) {
    throw new Error('No se pudo abrir la atención de la mesa.')
  }

  const created = toAttention(payload)
  await postStatusHistory('attention', created.id, null, 'open', options.userName ?? null, null)
  return created
}

/** Comprueba que la sede está activa y que la mesa existe y está habilitada para abrir una atención. */
export async function assertTableCanOpen(restaurantId: string, tableNumber: string): Promise<void> {
  const [site, operation] = await Promise.all([fetchRestaurantById(restaurantId), fetchSiteOperation(restaurantId)])

  if (!site) {
    throw new BusinessRuleError('La sede no existe.')
  }

  if (!isRestaurantOpen(site)) {
    throw new BusinessRuleError(`${site.name} no está recibiendo pedidos en este momento.`)
  }

  const table = operation?.tables.find((item) => item.number === tableNumber)

  if (!table) {
    throw new BusinessRuleError(`La mesa ${tableNumber} no existe en esta sede.`)
  }

  if (table.status === 'maintenance') {
    throw new BusinessRuleError(`La mesa ${tableNumber} está en mantenimiento.`)
  }

  if (table.status === 'inactive') {
    throw new BusinessRuleError(`La mesa ${tableNumber} está inactiva.`)
  }
}

/**
 * Devuelve la atención activa de la mesa o abre una nueva. Garantiza una sola
 * atención activa por mesa: si dos dispositivos abren a la vez, se conserva la
 * más antigua y se cancela la duplicada.
 */
export async function openOrReuseAttention(
  restaurantId: string,
  tableNumber: string,
  options: { customerId?: string | null; userName?: string | null } = {},
): Promise<Attention> {
  const existing = await fetchOpenAttentionForTable(restaurantId, tableNumber)

  if (existing) {
    return existing
  }

  await assertTableCanOpen(restaurantId, tableNumber)
  const created = await createAttention(restaurantId, tableNumber, options)
  const winner = await fetchOpenAttentionForTable(restaurantId, tableNumber)

  if (winner && winner.id !== created.id) {
    await http<unknown>(`/attentions/${created.id}`, {
      method: 'PATCH',
      body: { status: 'cancelled', closedAt: new Date().toISOString(), cancellationReason: 'Atención duplicada' },
    })
    return winner
  }

  return created
}

async function patchAttention(id: string, body: Record<string, unknown>): Promise<Attention> {
  const payload = await http<unknown>(`/attentions/${id}`, { method: 'PATCH', body })

  if (!isAttention(payload)) {
    throw new Error('No se pudo actualizar la atención.')
  }

  return toAttention(payload)
}

async function fetchFreshAttention(attention: Attention): Promise<Attention> {
  const fresh = await fetchAttentionById(attention.id)

  if (!fresh) {
    throw new BusinessRuleError('La atención ya no existe.')
  }

  return fresh
}

/** El comensal pide la cuenta. Pedirla dos veces no hace nada. */
export async function requestAccount(attention: Attention): Promise<Attention> {
  const fresh = await fetchFreshAttention(attention)

  if (fresh.status === 'account-requested') {
    return fresh
  }

  if (fresh.status !== 'open') {
    throw new BusinessRuleError('Esta atención ya fue cerrada.')
  }

  const updated = await patchAttention(fresh.id, { status: 'account-requested' })
  await postStatusHistory('attention', fresh.id, fresh.status, 'account-requested', null, null)
  return updated
}

/** Vuelve a dejar la atención abierta (por ejemplo, si el comensal pide algo más tras pedir la cuenta). */
export async function reopenAttention(attention: Attention, userName: string | null): Promise<Attention> {
  const fresh = await fetchFreshAttention(attention)

  if (fresh.status !== 'account-requested') {
    return fresh
  }

  const updated = await patchAttention(fresh.id, { status: 'open' })
  await postStatusHistory('attention', fresh.id, fresh.status, 'open', userName, 'Nuevo pedido tras solicitar la cuenta')
  return updated
}

/** Cierra la atención. Solo se permite cuando el saldo pendiente es cero. */
export async function closeAttention(attention: Attention, userName: string | null): Promise<Attention> {
  const fresh = await fetchFreshAttention(attention)

  if (fresh.status === 'closed') {
    return fresh
  }

  if (!isAttentionActive(fresh)) {
    throw new BusinessRuleError('La atención ya no está activa.')
  }

  const [products, payments] = await Promise.all([
    fetchOrderedProductsByAttention(fresh.id),
    fetchPaymentsByAttention(fresh.id),
  ])

  if (computeAccount(products, payments).remaining > 0.001) {
    throw new BusinessRuleError('No se puede cerrar una cuenta con saldo pendiente.')
  }

  const updated = await patchAttention(fresh.id, { status: 'closed', closedAt: new Date().toISOString() })
  await postStatusHistory('attention', fresh.id, fresh.status, 'closed', userName, null)
  return updated
}

/** Cancela la atención completa con motivo. No se permite si ya hay pagos registrados. */
export async function cancelAttention(attention: Attention, userName: string | null, reason: string): Promise<Attention> {
  if (!reason.trim()) {
    throw new BusinessRuleError('Indica el motivo de la cancelación.')
  }

  const fresh = await fetchFreshAttention(attention)

  if (!isAttentionActive(fresh)) {
    throw new BusinessRuleError('La atención ya no está activa.')
  }

  const payments = await fetchPaymentsByAttention(fresh.id)

  if (payments.some((payment) => payment.status === 'paid')) {
    throw new BusinessRuleError('No se puede cancelar una atención con pagos registrados. Reembolsa primero los pagos.')
  }

  const products = await fetchOrderedProductsByAttention(fresh.id)

  for (const product of products.filter((item) => isBillableProduct(item.status) && item.status !== 'delivered')) {
    await updateOrderedProductStatus(product, 'cancelled', userName, reason)
  }

  const updated = await patchAttention(fresh.id, {
    status: 'cancelled',
    closedAt: new Date().toISOString(),
    cancellationReason: reason.trim(),
  })
  await postStatusHistory('attention', fresh.id, fresh.status, 'cancelled', userName, reason.trim())
  return updated
}

// ── Productos solicitados ───────────────────────────────────────────────

export async function fetchAllOrderedProducts(): Promise<OrderedProduct[]> {
  const payload = await http<unknown>('/orderedProducts')

  if (!Array.isArray(payload)) {
    return []
  }

  return payload
    .filter(isOrderedProduct)
    .map(toOrderedProduct)
    .sort((a, b) => (a.requestedAt < b.requestedAt ? -1 : 1))
}

export async function fetchOrderedProductsBySite(restaurantId: string): Promise<OrderedProduct[]> {
  return (await fetchAllOrderedProducts()).filter((product) => product.restaurantId === restaurantId)
}

export async function fetchOrderedProductsByAttention(attentionId: string): Promise<OrderedProduct[]> {
  return (await fetchAllOrderedProducts()).filter((product) => product.attentionId === attentionId)
}

export async function fetchAttentionsWithProductsBySite(restaurantId: string): Promise<AttentionWithProducts[]> {
  const [attentions, products] = await Promise.all([
    fetchAttentionsBySite(restaurantId),
    fetchOrderedProductsBySite(restaurantId),
  ])

  return attentions.map((attention) => ({
    ...attention,
    products: products.filter((product) => product.attentionId === attention.id),
  }))
}

export interface CartIssue {
  productId: string
  name: string
  kind: 'missing' | 'inactive' | 'unavailable' | 'price-changed'
  /** Precio vigente, cuando cambió. */
  currentPrice: number | null
}

/**
 * Revisa el carrito contra la carta vigente antes de enviarlo: productos que ya
 * no existen, se desactivaron, se agotaron o cambiaron de precio.
 */
export async function validateOrderItems(
  restaurantId: string,
  items: Array<{ productId: string; name: string; unitPrice: number }>,
): Promise<CartIssue[]> {
  const products = await fetchMenuProducts(restaurantId)
  const issues: CartIssue[] = []

  for (const item of items) {
    const product = products.find((candidate) => candidate.id === item.productId)

    if (!product) {
      issues.push({ productId: item.productId, name: item.name, kind: 'missing', currentPrice: null })
    } else if (!product.isActive) {
      issues.push({ productId: item.productId, name: item.name, kind: 'inactive', currentPrice: null })
    } else if (!product.isAvailable) {
      issues.push({ productId: item.productId, name: item.name, kind: 'unavailable', currentPrice: null })
    } else if (Math.abs(product.price - item.unitPrice) > 0.001) {
      issues.push({ productId: item.productId, name: item.name, kind: 'price-changed', currentPrice: product.price })
    }
  }

  return issues
}

async function fetchProductsByBatch(batchId: string): Promise<OrderedProduct[]> {
  const payload = await http<unknown>(`/orderedProducts?batchId=${encodeURIComponent(batchId)}`)

  if (!Array.isArray(payload)) {
    return []
  }

  return payload.filter(isOrderedProduct).map(toOrderedProduct)
}

/**
 * Envía una ronda de productos a una atención activa. El precio y el nombre se
 * toman de la carta vigente (no del cliente). Los pedidos del comensal entran
 * como `sent`; los que carga el personal, como `confirmed`. Es idempotente por `batchId`:
 * si un reintento llega con el mismo batchId, solo se crean los que faltan.
 */
export async function addOrderedProducts(
  attention: Attention,
  items: NewOrderedProductInput[],
  options: OrderBatchOptions,
): Promise<OrderedProduct[]> {
  const fresh = await fetchFreshAttention(attention)

  if (!isAttentionActive(fresh)) {
    throw new BusinessRuleError('No se pueden agregar productos a una atención cerrada o cancelada.')
  }

  const catalog = await fetchMenuProducts(fresh.restaurantId)
  const alreadySent = await fetchProductsByBatch(options.batchId)
  const created: OrderedProduct[] = [...alreadySent]
  const requestedAt = alreadySent[0]?.requestedAt ?? new Date().toISOString()
  // Lo que carga el personal ya está validado con el comensal: entra confirmado y va directo a cocina.
  const initialStatus: OrderedProductStatus = options.createdBy ? 'confirmed' : 'sent'

  for (const item of items) {
    if (alreadySent.some((product) => product.productId === item.productId)) {
      continue
    }

    const product = catalog.find((candidate) => candidate.id === item.productId)

    if (!product || product.restaurantId !== fresh.restaurantId) {
      throw new BusinessRuleError(`"${item.name}" no pertenece a la carta de esta sede.`)
    }

    if (!product.isActive || !product.isAvailable) {
      throw new BusinessRuleError(`"${product.name}" no está disponible.`)
    }

    const payload = await http<unknown>('/orderedProducts', {
      method: 'POST',
      body: {
        attentionId: fresh.id,
        restaurantId: fresh.restaurantId,
        productId: product.id,
        name: product.name,
        unitPrice: product.price,
        quantity: item.quantity,
        subtotal: roundMoney(product.price * item.quantity),
        notes: item.notes,
        status: initialStatus,
        rejectionReason: null,
        requestedAt,
        batchId: options.batchId,
        createdBy: options.createdBy,
        customerId: options.customerId,
      },
    })

    if (!isOrderedProduct(payload)) {
      throw new Error('No se pudo enviar uno de los productos del pedido.')
    }

    const createdProduct = toOrderedProduct(payload)
    await postStatusHistory('orderedProduct', createdProduct.id, null, initialStatus, options.createdBy, null)
    created.push(createdProduct)
  }

  if (fresh.status === 'account-requested') {
    await reopenAttention(fresh, options.createdBy)
  }

  return created
}

/**
 * Cambia el estado de un producto validando la transición y que nadie lo haya
 * cambiado antes (control optimista: se compara con el estado que vio el usuario).
 */
export async function updateOrderedProductStatus(
  product: OrderedProduct,
  toStatus: OrderedProductStatus,
  userName: string | null,
  reason: string | null = null,
): Promise<OrderedProduct> {
  const current = await http<unknown>(`/orderedProducts/${product.id}`)

  if (!isOrderedProduct(current)) {
    throw new BusinessRuleError('El producto ya no existe.')
  }

  if (current.status !== product.status) {
    throw new ConflictError(
      `"${product.name}" ya cambió de estado (ahora está en otro paso). Se actualizó la pantalla.`,
    )
  }

  if (!canTransitionOrderedProduct(product.status, toStatus)) {
    throw new BusinessRuleError('Ese cambio de estado no está permitido.')
  }

  if ((toStatus === 'rejected' || toStatus === 'cancelled') && !reason?.trim()) {
    throw new BusinessRuleError('Indica el motivo.')
  }

  const payload = await http<unknown>(`/orderedProducts/${product.id}`, {
    method: 'PATCH',
    body: {
      status: toStatus,
      rejectionReason: toStatus === 'rejected' || toStatus === 'cancelled' ? reason?.trim() ?? null : null,
    },
  })

  if (!isOrderedProduct(payload)) {
    throw new Error('No se pudo actualizar el estado del producto.')
  }

  await postStatusHistory('orderedProduct', product.id, product.status, toStatus, userName, reason)

  return toOrderedProduct(payload)
}

export interface BulkUpdateResult {
  updated: OrderedProduct[]
  failed: Array<{ product: OrderedProduct; message: string }>
}

/** Cambia varios productos al mismo estado. Los que fallan (conflicto, regla) se informan sin cortar el resto. */
export async function updateOrderedProductsStatus(
  products: OrderedProduct[],
  toStatus: OrderedProductStatus,
  userName: string | null,
  reason: string | null = null,
): Promise<BulkUpdateResult> {
  const result: BulkUpdateResult = { updated: [], failed: [] }

  for (const product of products) {
    try {
      result.updated.push(await updateOrderedProductStatus(product, toStatus, userName, reason))
    } catch (error) {
      result.failed.push({ product, message: errorMessage(error, 'No se pudo actualizar.') })
    }
  }

  return result
}

// ── Historial ───────────────────────────────────────────────────────────

async function postStatusHistory(
  entityType: StatusHistoryEntityType,
  entityId: string,
  fromStatus: string | null,
  toStatus: string,
  userName: string | null,
  reason: string | null,
): Promise<void> {
  await http<unknown>('/statusHistory', {
    method: 'POST',
    body: { entityType, entityId, fromStatus, toStatus, userName, reason, changedAt: new Date().toISOString() },
  })
}

export async function fetchAllStatusHistory(): Promise<StatusHistoryEntry[]> {
  const payload = await http<unknown>('/statusHistory')

  if (!Array.isArray(payload)) {
    return []
  }

  return payload
    .filter(isStatusHistoryEntry)
    .map(toStatusHistoryEntry)
    .sort((a, b) => (a.changedAt < b.changedAt ? -1 : 1))
}

export async function fetchStatusHistory(
  entityType: StatusHistoryEntityType,
  entityId: string,
): Promise<StatusHistoryEntry[]> {
  return (await fetchAllStatusHistory()).filter(
    (entry) => entry.entityType === entityType && entry.entityId === entityId,
  )
}

/** Historial de la atención y de todos sus productos, en orden cronológico. */
export async function fetchAttentionTimeline(
  attentionId: string,
  productIds: string[],
): Promise<StatusHistoryEntry[]> {
  const ids = new Set(productIds)
  return (await fetchAllStatusHistory()).filter(
    (entry) =>
      (entry.entityType === 'attention' && entry.entityId === attentionId) ||
      (entry.entityType === 'orderedProduct' && ids.has(entry.entityId)),
  )
}
