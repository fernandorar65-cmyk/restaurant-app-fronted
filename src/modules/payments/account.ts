import { isBillableProduct } from '@/modules/orders/order-status-labels'
import type { OrderedProduct } from '@/modules/orders/types'
import type { Payment } from '@/modules/payments/types'
import { roundMoney } from '@/utils/money'

export interface ProductBalance {
  product: OrderedProduct
  /** Pagado específicamente para este producto. */
  allocated: number
  pending: number
}

export interface AccountSummary {
  /** Total cobrable: excluye productos rechazados y cancelados. */
  total: number
  /** Suma de pagos en estado `paid` (los fallidos, cancelados o reembolsados no cuentan). */
  paid: number
  remaining: number
  products: ProductBalance[]
}

export function countsAsPaid(payment: Payment): boolean {
  return payment.status === 'paid'
}

export function computeAccount(products: OrderedProduct[], payments: Payment[]): AccountSummary {
  const billable = products.filter((product) => isBillableProduct(product.status))
  const paidPayments = payments.filter(countsAsPaid)
  const total = roundMoney(billable.reduce((sum, product) => sum + product.subtotal, 0))
  const paid = roundMoney(paidPayments.reduce((sum, payment) => sum + payment.amount, 0))

  const allocatedById = new Map<string, number>()

  for (const payment of paidPayments) {
    for (const allocation of payment.allocations) {
      allocatedById.set(
        allocation.orderedProductId,
        (allocatedById.get(allocation.orderedProductId) ?? 0) + allocation.amount,
      )
    }
  }

  return {
    total,
    paid,
    remaining: roundMoney(Math.max(total - paid, 0)),
    products: billable.map((product) => {
      const allocated = roundMoney(allocatedById.get(product.id) ?? 0)
      return { product, allocated, pending: roundMoney(Math.max(product.subtotal - allocated, 0)) }
    }),
  }
}
