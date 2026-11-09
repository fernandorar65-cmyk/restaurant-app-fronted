import type { MethodTotals } from '@/modules/finance/methods'

/** Ingresos por método de pago (neto cobrado: pagos menos reembolsos). */
export type RevenueByMethod = MethodTotals

/**
 * Cifras de un día en una sede (`DailyFinancialsDto` de `/reports/daily-financials`).
 * El API devuelve todos los días del rango, con ceros si no hubo actividad.
 */
export interface DailyFinancial {
  restaurantId: string
  /** Fecha comercial YYYY-MM-DD en la zona de la sede. */
  date: string
  /** Ventas netas (brutas menos reembolsos). */
  revenue: number
  grossSales: number
  refunded: number
  /** Atenciones cerradas. */
  orders: number
  cancelled: number
  /** Gastos registrados (no anulados). */
  expenses: number
  /** Ventas netas menos gastos (sin costo de insumos ni de personal). Puede ser negativo. */
  profit: number
  byMethod: RevenueByMethod
}

export type FinancePeriod = 'day' | 'month' | 'year'

/** Totales de un conjunto de días. */
export interface FinanceTotals {
  revenue: number
  grossSales: number
  refunded: number
  costs: number
  profit: number
  orders: number
  cancelled: number
  /** Días con actividad (ventas, atenciones o gastos). */
  days: number
  byMethod: RevenueByMethod
}
