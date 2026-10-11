import type { DailyFinancial, OperatingExpenses, RevenueByMethod } from '@/modules/finance/types'
import { http } from '@/services/http'

function isDailyFinancial(value: unknown): value is DailyFinancial {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const record = value as Record<string, unknown>
  return (
    typeof record.id === 'string' &&
    (typeof record.restaurantId === 'string' || typeof record.restaurantId === 'number') &&
    typeof record.date === 'string' &&
    ['revenue', 'orders', 'foodCost', 'laborCost', 'operatingCost', 'profit'].every((key) => typeof record[key] === 'number')
  )
}

function toNumbers<T extends object>(value: unknown, keys: Array<keyof T>, fallback: Partial<T>): T {
  const record = typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null
  return Object.fromEntries(
    keys.map((key) => {
      const raw = record?.[key as string]
      return [key, typeof raw === 'number' ? raw : record ? 0 : ((fallback[key] as number | undefined) ?? 0)]
    }),
  ) as T
}

/**
 * Cierres diarios entre dos fechas (inclusive), de todas las sedes.
 * Contrato pensado para el backend: GET /finance/daily?from=…&to=…&restaurantIds=…
 * (allí se calculará desde las atenciones y pagos cerrados; hoy viene de db.json).
 */
export async function fetchDailyFinancials(from: string, to: string): Promise<DailyFinancial[]> {
  const params = new URLSearchParams({ 'date:gte': from, 'date:lte': to })
  const payload = await http<unknown>(`/dailyFinancials?${params.toString()}`)

  if (!Array.isArray(payload)) {
    return []
  }

  return payload.filter(isDailyFinancial).map((row) => ({
    ...row,
    restaurantId: String(row.restaurantId),
    guests: typeof row.guests === 'number' ? row.guests : 0,
    // Sin desglose guardado, todo el gasto de operación cuenta como "otros".
    expenses: toNumbers<OperatingExpenses>(row.expenses, ['rent', 'utilities', 'maintenance', 'marketing', 'other'], { other: row.operatingCost }),
    byMethod: toNumbers<RevenueByMethod>(row.byMethod, ['card', 'yape', 'plin', 'transfer', 'cash'], { card: row.revenue }),
  }))
}
