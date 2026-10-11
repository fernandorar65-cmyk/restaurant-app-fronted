import type { DailyFinancial, FinancePeriod, FinanceTotals } from '@/modules/finance/types'

/** Fechas locales en formato YYYY-MM-DD (sin desfases de zona horaria). */
export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function parseDateKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year!, (month ?? 1) - 1, day ?? 1)
}

function addDays(key: string, days: number): string {
  const date = parseDateKey(key)
  date.setDate(date.getDate() + days)
  return toDateKey(date)
}

export interface PeriodRange {
  from: string
  to: string
}

/**
 * Rango del período elegido. `anchor` es una fecha dentro del período.
 * - día: ese día · mes: del 1 al último día · año: de enero a diciembre.
 */
export function periodRange(period: FinancePeriod, anchor: string): PeriodRange {
  const date = parseDateKey(anchor)

  if (period === 'day') {
    return { from: anchor, to: anchor }
  }

  if (period === 'month') {
    const first = new Date(date.getFullYear(), date.getMonth(), 1)
    const last = new Date(date.getFullYear(), date.getMonth() + 1, 0)
    return { from: toDateKey(first), to: toDateKey(last) }
  }

  return { from: `${date.getFullYear()}-01-01`, to: `${date.getFullYear()}-12-31` }
}

/**
 * Período con el que se compara: para un día, el mismo día de la semana anterior
 * (en un restaurante un lunes no se compara con un domingo); mes y año, el anterior.
 */
export function previousAnchor(period: FinancePeriod, anchor: string): string {
  const date = parseDateKey(anchor)

  if (period === 'day') {
    return addDays(anchor, -7)
  }

  if (period === 'month') {
    return toDateKey(new Date(date.getFullYear(), date.getMonth() - 1, 1))
  }

  return toDateKey(new Date(date.getFullYear() - 1, 0, 1))
}

/** Mueve el período elegido hacia atrás (-1) o adelante (+1). */
export function shiftAnchor(period: FinancePeriod, anchor: string, step: -1 | 1): string {
  const date = parseDateKey(anchor)

  if (period === 'day') {
    return addDays(anchor, step)
  }

  if (period === 'month') {
    return toDateKey(new Date(date.getFullYear(), date.getMonth() + step, 1))
  }

  return toDateKey(new Date(date.getFullYear() + step, 0, 1))
}

export interface TimeBucket {
  key: string
  label: string
  from: string
  to: string
}

const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

/**
 * Puntos de la evolución temporal: día → los últimos 14 días; mes → cada día;
 * año → cada mes.
 */
export function timeBuckets(period: FinancePeriod, anchor: string): TimeBucket[] {
  if (period === 'year') {
    const year = parseDateKey(anchor).getFullYear()
    return MONTHS_SHORT.map((label, month) => {
      const range = periodRange('month', toDateKey(new Date(year, month, 1)))
      return { key: range.from.slice(0, 7), label, ...range }
    })
  }

  const { from, to } = period === 'month' ? periodRange('month', anchor) : { from: addDays(anchor, -13), to: anchor }
  const buckets: TimeBucket[] = []

  for (let key = from; key <= to; key = addDays(key, 1)) {
    const date = parseDateKey(key)
    buckets.push({ key, label: `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}`, from: key, to: key })
  }

  return buckets
}

export function emptyTotals(): FinanceTotals {
  return {
    revenue: 0,
    costs: 0,
    foodCost: 0,
    laborCost: 0,
    operatingCost: 0,
    profit: 0,
    orders: 0,
    guests: 0,
    days: 0,
    expenses: { rent: 0, utilities: 0, maintenance: 0, marketing: 0, other: 0 },
    byMethod: { card: 0, yape: 0, plin: 0, transfer: 0, cash: 0 },
  }
}

export function sumTotals(rows: DailyFinancial[]): FinanceTotals {
  return rows.reduce((acc, row) => {
    acc.revenue += row.revenue
    acc.foodCost += row.foodCost
    acc.laborCost += row.laborCost
    acc.operatingCost += row.operatingCost
    acc.costs += row.foodCost + row.laborCost + row.operatingCost
    acc.profit += row.profit
    acc.orders += row.orders
    acc.guests += row.guests
    acc.days += 1
    for (const key of Object.keys(acc.expenses) as Array<keyof typeof acc.expenses>) acc.expenses[key] += row.expenses[key]
    for (const key of Object.keys(acc.byMethod) as Array<keyof typeof acc.byMethod>) acc.byMethod[key] += row.byMethod[key]
    return acc
  }, emptyTotals())
}

/** Etiqueta legible del período: "11 oct 2026", "octubre de 2026", "2026". */
export function periodLabel(period: FinancePeriod, anchor: string): string {
  const date = parseDateKey(anchor)

  if (period === 'day') {
    return new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(date)
  }

  if (period === 'month') {
    return new Intl.DateTimeFormat('es', { month: 'long', year: 'numeric' }).format(date)
  }

  return String(date.getFullYear())
}

export function comparisonLabel(period: FinancePeriod): string {
  return { day: 'vs. mismo día semana anterior', month: 'vs. mes anterior', year: 'vs. año anterior' }[period]
}
