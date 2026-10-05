import { isBillableProduct } from '@/modules/orders/order-status-labels'
import type { Attention, OrderedProduct, StatusHistoryEntry } from '@/modules/orders/types'
import { countsAsPaid } from '@/modules/payments/account'
import type { Payment, PaymentMethod } from '@/modules/payments/types'
import { roundMoney } from '@/utils/money'
import { localDateKey } from '@/utils/time'

export type MetricsPeriod = 'today' | 'week' | 'all'

export interface RankedItem {
  label: string
  value: number
  detail?: string
}

export interface SiteMetrics {
  /** Minutos promedio de cada tramo; null si no hay datos suficientes. */
  minutesToConfirm: number | null
  minutesToReady: number | null
  minutesToDeliver: number | null
  minutesEndToEnd: number | null
  attentionsClosed: number
  attentionsCancelled: number
  averageAttentionMinutes: number | null
  /** Atenciones cerradas por mesa usada en el período. */
  tableTurnover: number | null
  sales: number
  averageTicket: number | null
  topProducts: RankedItem[]
  rejectedProducts: RankedItem[]
  qrShare: number | null
  qrCount: number
  manualCount: number
}

function minutesBetween(from: string, to: string): number {
  return (new Date(to).getTime() - new Date(from).getTime()) / 60000
}

function average(values: number[]): number | null {
  return values.length === 0 ? null : Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10
}

/** ¿El instante cae dentro del período, según la zona horaria de la sede? */
export function isInPeriod(isoDate: string, period: MetricsPeriod, timeZone: string, now = new Date()): boolean {
  if (period === 'all') {
    return true
  }

  const today = localDateKey(now.toISOString(), timeZone)
  const day = localDateKey(isoDate, timeZone)

  if (period === 'today') {
    return day === today
  }

  const weekAgo = localDateKey(new Date(now.getTime() - 6 * 86400000).toISOString(), timeZone)
  return day >= weekAgo && day <= today
}

/** Primer momento en que cada producto llegó a cada estado, según el historial. */
function firstTimes(history: StatusHistoryEntry[]): Map<string, Map<string, string>> {
  const times = new Map<string, Map<string, string>>()

  for (const entry of history) {
    if (entry.entityType !== 'orderedProduct') {
      continue
    }

    const byStatus = times.get(entry.entityId) ?? new Map<string, string>()

    if (!byStatus.has(entry.toStatus)) {
      byStatus.set(entry.toStatus, entry.changedAt)
    }

    times.set(entry.entityId, byStatus)
  }

  return times
}

export function computeSiteMetrics(input: {
  attentions: Attention[]
  products: OrderedProduct[]
  history: StatusHistoryEntry[]
  payments: Payment[]
  period: MetricsPeriod
  timeZone: string
}): SiteMetrics {
  const { period, timeZone } = input
  const attentions = input.attentions.filter((attention) => isInPeriod(attention.openedAt, period, timeZone))
  const attentionIds = new Set(attentions.map((attention) => attention.id))
  const products = input.products.filter((product) => attentionIds.has(product.attentionId))
  const times = firstTimes(input.history)

  const toConfirm: number[] = []
  const toReady: number[] = []
  const toDeliver: number[] = []
  const endToEnd: number[] = []

  for (const product of products) {
    const byStatus = times.get(product.id)
    const sent = byStatus?.get('sent') ?? product.requestedAt
    const confirmed = byStatus?.get('confirmed')
    const ready = byStatus?.get('ready')
    const delivered = byStatus?.get('delivered')

    if (confirmed && byStatus?.has('sent')) {
      toConfirm.push(minutesBetween(sent, confirmed))
    }

    if (confirmed && ready) {
      toReady.push(minutesBetween(confirmed, ready))
    }

    if (ready && delivered) {
      toDeliver.push(minutesBetween(ready, delivered))
    }

    if (delivered) {
      endToEnd.push(minutesBetween(product.requestedAt, delivered))
    }
  }

  const closed = attentions.filter((attention) => attention.status === 'closed')
  const durations = closed
    .filter((attention) => attention.closedAt)
    .map((attention) => minutesBetween(attention.openedAt, attention.closedAt ?? attention.openedAt))
  const tablesUsed = new Set(attentions.map((attention) => attention.tableNumber)).size

  const closedIds = new Set(closed.map((attention) => attention.id))
  const paidByAttention = new Map<string, number>()

  for (const payment of input.payments.filter((item) => countsAsPaid(item) && closedIds.has(item.attentionId))) {
    paidByAttention.set(payment.attentionId, (paidByAttention.get(payment.attentionId) ?? 0) + payment.amount)
  }

  const sales = roundMoney([...paidByAttention.values()].reduce((sum, value) => sum + value, 0))
  const ticketValues = [...paidByAttention.values()].filter((value) => value > 0)

  const quantities = new Map<string, number>()
  const rejections = new Map<string, { count: number; reasons: Set<string> }>()

  for (const product of products) {
    if (isBillableProduct(product.status)) {
      quantities.set(product.name, (quantities.get(product.name) ?? 0) + product.quantity)
    } else if (product.status === 'rejected') {
      const current = rejections.get(product.name) ?? { count: 0, reasons: new Set<string>() }
      current.count += product.quantity

      if (product.rejectionReason) {
        current.reasons.add(product.rejectionReason)
      }

      rejections.set(product.name, current)
    }
  }

  const qrCount = products.filter((product) => product.createdBy === null).length
  const manualCount = products.length - qrCount

  return {
    minutesToConfirm: average(toConfirm),
    minutesToReady: average(toReady),
    minutesToDeliver: average(toDeliver),
    minutesEndToEnd: average(endToEnd),
    attentionsClosed: closed.length,
    attentionsCancelled: attentions.filter((attention) => attention.status === 'cancelled').length,
    averageAttentionMinutes: average(durations),
    tableTurnover: tablesUsed === 0 ? null : Math.round((closed.length / tablesUsed) * 10) / 10,
    sales,
    averageTicket: ticketValues.length === 0 ? null : roundMoney(sales / ticketValues.length),
    topProducts: [...quantities.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8),
    rejectedProducts: [...rejections.entries()]
      .map(([label, data]) => ({ label, value: data.count, detail: [...data.reasons].join(' · ') }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8),
    qrShare: products.length === 0 ? null : Math.round((qrCount / products.length) * 100),
    qrCount,
    manualCount,
  }
}

export interface DailyClosingSummary {
  dateKey: string
  open: number
  closed: number
  cancelled: number
  openAttentions: Attention[]
  totalPaid: number
  byMethod: Array<{ method: PaymentMethod; amount: number; count: number }>
  byEmployee: Array<{ name: string; amount: number; count: number }>
  pendingPayments: number
}

/** Resumen de caja de un día local de la sede. */
export function computeDailyClosing(input: {
  attentions: Attention[]
  payments: Payment[]
  dateKey: string
  timeZone: string
}): DailyClosingSummary {
  const { dateKey, timeZone } = input
  const dayAttentions = input.attentions.filter(
    (attention) =>
      localDateKey(attention.openedAt, timeZone) === dateKey ||
      (attention.closedAt !== null && localDateKey(attention.closedAt, timeZone) === dateKey),
  )
  const siteAttentionIds = new Set(input.attentions.map((attention) => attention.id))
  const dayPayments = input.payments.filter(
    (payment) => siteAttentionIds.has(payment.attentionId) && localDateKey(payment.createdAt, timeZone) === dateKey,
  )
  const paid = dayPayments.filter(countsAsPaid)

  const byMethod = new Map<PaymentMethod, { amount: number; count: number }>()
  const byEmployee = new Map<string, { amount: number; count: number }>()

  for (const payment of paid) {
    const method = byMethod.get(payment.method) ?? { amount: 0, count: 0 }
    method.amount += payment.amount
    method.count += 1
    byMethod.set(payment.method, method)

    const name = payment.processedByEmployeeName ?? 'Sin registrar'
    const employee = byEmployee.get(name) ?? { amount: 0, count: 0 }
    employee.amount += payment.amount
    employee.count += 1
    byEmployee.set(name, employee)
  }

  const openAttentions = dayAttentions.filter(
    (attention) => attention.status === 'open' || attention.status === 'account-requested',
  )

  return {
    dateKey,
    open: openAttentions.length,
    closed: dayAttentions.filter((attention) => attention.status === 'closed').length,
    cancelled: dayAttentions.filter((attention) => attention.status === 'cancelled').length,
    openAttentions,
    totalPaid: roundMoney(paid.reduce((sum, payment) => sum + payment.amount, 0)),
    byMethod: [...byMethod.entries()]
      .map(([method, data]) => ({ method, amount: roundMoney(data.amount), count: data.count }))
      .sort((a, b) => b.amount - a.amount),
    byEmployee: [...byEmployee.entries()]
      .map(([name, data]) => ({ name, amount: roundMoney(data.amount), count: data.count }))
      .sort((a, b) => b.amount - a.amount),
    pendingPayments: dayPayments.filter((payment) => payment.status === 'pending' || payment.status === 'processing').length,
  }
}
