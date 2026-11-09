import { toMethodTotals } from '@/modules/finance/methods'
import { parseDateKey, toDateKey } from '@/modules/finance/period'
import type { DailyFinancial } from '@/modules/finance/types'
import { http } from '@/services/http'

/** El API acepta como máximo 366 días por consulta. */
const MAX_DAYS = 366

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

const num = (value: unknown) => (typeof value === 'number' ? value : 0)

function toDailyFinancial(restaurantId: string, value: Record<string, unknown>): DailyFinancial {
  return {
    restaurantId,
    date: String(value.businessDate),
    revenue: num(value.netSales),
    grossSales: num(value.grossSales),
    refunded: num(value.refundedAmount),
    orders: num(value.closedAttentions),
    cancelled: num(value.cancelledAttentions),
    expenses: num(value.expenseAmount),
    profit: num(value.profit),
    byMethod: toMethodTotals(value.byMethod),
  }
}

/** Parte [from, to] en tramos de como mucho 366 días. */
function chunks(from: string, to: string): Array<{ from: string; to: string }> {
  const result: Array<{ from: string; to: string }> = []
  let start = from

  while (start <= to) {
    const end = parseDateKey(start)
    end.setDate(end.getDate() + MAX_DAYS - 1)
    const endKey = toDateKey(end) < to ? toDateKey(end) : to
    result.push({ from: start, to: endKey })
    const next = parseDateKey(endKey)
    next.setDate(next.getDate() + 1)
    start = toDateKey(next)
  }

  return result
}

/** Serie diaria de una sede. GET /reports/daily-financials */
async function fetchSiteFinancials(restaurantId: string, from: string, to: string): Promise<DailyFinancial[]> {
  const payload = await http<unknown>('/reports/daily-financials', { query: { restaurantId, from, to } })
  const days = isRecord(payload) && Array.isArray(payload.days) ? payload.days : []
  return days.filter(isRecord).map((day) => toDailyFinancial(restaurantId, day))
}

/**
 * Cifras diarias de varias sedes entre dos fechas comerciales (inclusive).
 * Una consulta por sede y tramo de 366 días; el servidor calcula todo desde atenciones,
 * pagos y gastos (cada día coincide con el preview del cierre de ese día).
 */
export async function fetchDailyFinancials(restaurantIds: string[], from: string, to: string): Promise<DailyFinancial[]> {
  if (restaurantIds.length === 0 || from > to) return []
  const ranges = chunks(from, to)
  const results = await Promise.all(
    restaurantIds.flatMap((id) => ranges.map((range) => fetchSiteFinancials(id, range.from, range.to))),
  )
  return results.flat()
}
