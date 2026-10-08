import type { StatusTone } from '@/components/base/StatusBadge.vue'
import type { AttentionStatus, OrderedProductStatus } from '@/modules/orders/types'

export const attentionStatusLabel: Record<AttentionStatus, string> = {
  open: 'Abierta',
  'account-requested': 'Cuenta solicitada',
  closed: 'Cerrada',
  cancelled: 'Cancelada',
}

export const attentionStatusBadgeClass: Record<AttentionStatus, string> = {
  open: 'bg-secondary-container text-on-secondary-container',
  'account-requested': 'bg-tertiary-fixed text-on-tertiary-container',
  closed: 'bg-surface-container-high text-on-surface-variant',
  cancelled: 'bg-error-container text-on-error-container',
}

export const orderedProductStatusLabel: Record<OrderedProductStatus, string> = {
  sent: 'Enviado',
  confirmed: 'Confirmado',
  preparing: 'En preparación',
  ready: 'Listo',
  delivered: 'Entregado',
  rejected: 'Rechazado',
  cancelled: 'Cancelado',
}

export const orderedProductStatusHint: Record<OrderedProductStatus, string> = {
  sent: 'La cocina todavía no confirmó este producto.',
  confirmed: 'Confirmado, pendiente de empezar a preparar.',
  preparing: 'Se está preparando en cocina.',
  ready: 'Listo para servir en mesa.',
  delivered: 'Ya está en la mesa.',
  rejected: 'La sede rechazó este producto.',
  cancelled: 'Este producto fue cancelado.',
}

export const orderedProductStatusSteps: OrderedProductStatus[] = [
  'sent',
  'confirmed',
  'preparing',
  'ready',
  'delivered',
]

export const orderedProductBadgeClass: Record<OrderedProductStatus, string> = {
  sent: 'bg-secondary-container text-on-secondary-container',
  confirmed: 'bg-primary-fixed text-on-primary-fixed',
  preparing: 'bg-primary text-on-primary',
  ready: 'bg-tertiary-fixed text-on-tertiary-container',
  delivered: 'bg-success-container text-on-success-container',
  rejected: 'bg-error-container text-on-error-container',
  cancelled: 'bg-surface-container-high text-on-surface-variant',
}

const NEXT_PRODUCT_STATUS: Partial<Record<OrderedProductStatus, OrderedProductStatus>> = {
  sent: 'confirmed',
  confirmed: 'preparing',
  preparing: 'ready',
  ready: 'delivered',
}

const NEXT_PRODUCT_ACTION_LABEL: Partial<Record<OrderedProductStatus, string>> = {
  sent: 'Confirmar',
  confirmed: 'Iniciar preparación',
  preparing: 'Marcar listo',
  ready: 'Marcar entregado',
}

export function nextOrderedProductStatus(status: OrderedProductStatus): OrderedProductStatus | null {
  return NEXT_PRODUCT_STATUS[status] ?? null
}

export function nextOrderedProductActionLabel(status: OrderedProductStatus): string | null {
  return NEXT_PRODUCT_ACTION_LABEL[status] ?? null
}

/** Transiciones válidas de un producto solicitado. */
const ALLOWED_TRANSITIONS: Record<OrderedProductStatus, readonly OrderedProductStatus[]> = {
  sent: ['confirmed', 'rejected', 'cancelled'],
  confirmed: ['preparing', 'rejected', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['delivered', 'cancelled'],
  delivered: [],
  rejected: [],
  cancelled: [],
}

export function canTransitionOrderedProduct(from: OrderedProductStatus, to: OrderedProductStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to)
}

export function canRejectOrderedProduct(status: OrderedProductStatus): boolean {
  return canTransitionOrderedProduct(status, 'rejected')
}

export function canCancelOrderedProduct(status: OrderedProductStatus): boolean {
  return canTransitionOrderedProduct(status, 'cancelled')
}

/** Producto en curso: todavía no se entregó ni se descartó. */
export function isPendingProduct(status: OrderedProductStatus): boolean {
  return status === 'sent' || status === 'confirmed' || status === 'preparing' || status === 'ready'
}

export function isBillableProduct(status: OrderedProductStatus): boolean {
  return status !== 'rejected' && status !== 'cancelled'
}

/** Tono visual único por estado (se usa con StatusBadge, que agrega el ícono). */
export const attentionStatusTone: Record<AttentionStatus, StatusTone> = {
  open: 'info',
  'account-requested': 'warning',
  closed: 'muted',
  cancelled: 'danger',
}

export const orderedProductStatusTone: Record<OrderedProductStatus, StatusTone> = {
  sent: 'neutral',
  confirmed: 'info',
  preparing: 'progress',
  ready: 'success',
  delivered: 'muted',
  rejected: 'danger',
  cancelled: 'muted',
}
