import type { DailyClosingSummary } from '@/modules/reports/metrics'
import { http } from '@/services/http'

export interface DailyClosingRecord {
  id: string
  restaurantId: string
  dateKey: string
  totalPaid: number
  closedAttentions: number
  cancelledAttentions: number
  openAttentions: number
  byMethod: DailyClosingSummary['byMethod']
  closedBy: string | null
  createdAt: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isClosing(value: unknown): value is DailyClosingRecord {
  return (
    isRecord(value) &&
    (typeof value.id === 'string' || typeof value.id === 'number') &&
    (typeof value.restaurantId === 'string' || typeof value.restaurantId === 'number') &&
    typeof value.dateKey === 'string' &&
    typeof value.totalPaid === 'number' &&
    typeof value.createdAt === 'string'
  )
}

function toClosing(value: DailyClosingRecord): DailyClosingRecord {
  return { ...value, id: String(value.id), restaurantId: String(value.restaurantId), byMethod: value.byMethod ?? [] }
}

export async function fetchDailyClosings(restaurantId: string): Promise<DailyClosingRecord[]> {
  const payload = await http<unknown>('/dailyClosures')

  if (!Array.isArray(payload)) {
    return []
  }

  return payload
    .filter(isClosing)
    .map(toClosing)
    .filter((closing) => closing.restaurantId === restaurantId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}

/** Guarda el cierre del día. Si ya existía uno para esa fecha, lo reemplaza. */
export async function saveDailyClosing(
  restaurantId: string,
  summary: DailyClosingSummary,
  closedBy: string | null,
): Promise<DailyClosingRecord> {
  const existing = (await fetchDailyClosings(restaurantId)).find((closing) => closing.dateKey === summary.dateKey)
  const body = {
    restaurantId,
    dateKey: summary.dateKey,
    totalPaid: summary.totalPaid,
    closedAttentions: summary.closed,
    cancelledAttentions: summary.cancelled,
    openAttentions: summary.open,
    byMethod: summary.byMethod,
    closedBy,
    createdAt: new Date().toISOString(),
  }

  const payload = existing
    ? await http<unknown>(`/dailyClosures/${existing.id}`, { method: 'PUT', body })
    : await http<unknown>('/dailyClosures', { method: 'POST', body })

  if (!isClosing(payload)) {
    throw new Error('No se pudo guardar el cierre.')
  }

  return toClosing(payload)
}
