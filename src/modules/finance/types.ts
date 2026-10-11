/** Desglose del gasto de operación. */
export interface OperatingExpenses {
  rent: number
  utilities: number
  maintenance: number
  marketing: number
  other: number
}

/** Ingresos por método de pago. */
export interface RevenueByMethod {
  card: number
  yape: number
  plin: number
  transfer: number
  cash: number
}

/** Cierre financiero de un día en una sede. */
export interface DailyFinancial {
  id: string
  restaurantId: string
  /** YYYY-MM-DD */
  date: string
  revenue: number
  orders: number
  guests: number
  foodCost: number
  laborCost: number
  operatingCost: number
  /** Ingresos menos costos (insumos, personal y operación). Puede ser negativo. */
  profit: number
  expenses: OperatingExpenses
  byMethod: RevenueByMethod
}

export type FinancePeriod = 'day' | 'month' | 'year'

/** Totales de un conjunto de días. */
export interface FinanceTotals {
  revenue: number
  costs: number
  foodCost: number
  laborCost: number
  operatingCost: number
  profit: number
  orders: number
  guests: number
  days: number
  expenses: OperatingExpenses
  byMethod: RevenueByMethod
}
