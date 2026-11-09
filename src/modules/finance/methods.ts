/**
 * Métodos de pago tal como los usan finanzas, gastos y cierres. El API los envía en
 * mayúsculas (`CASH`, `BANK_TRANSFER`…); el front trabaja en minúsculas.
 */
export type MoneyMethod = 'cash' | 'card' | 'yape' | 'plin' | 'transfer' | 'other'

export const MONEY_METHODS: readonly MoneyMethod[] = ['card', 'yape', 'plin', 'transfer', 'cash', 'other']

export type ApiMoneyMethod = 'CASH' | 'CARD' | 'YAPE' | 'PLIN' | 'BANK_TRANSFER' | 'OTHER'

const FROM_API: Record<ApiMoneyMethod, MoneyMethod> = {
  CASH: 'cash',
  CARD: 'card',
  YAPE: 'yape',
  PLIN: 'plin',
  BANK_TRANSFER: 'transfer',
  OTHER: 'other',
}

const TO_API: Record<MoneyMethod, ApiMoneyMethod> = {
  cash: 'CASH',
  card: 'CARD',
  yape: 'YAPE',
  plin: 'PLIN',
  transfer: 'BANK_TRANSFER',
  other: 'OTHER',
}

export const moneyMethodLabel: Record<MoneyMethod, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  yape: 'Yape',
  plin: 'Plin',
  transfer: 'Transferencia',
  other: 'Otro',
}

export function fromApiMethod(value: unknown): MoneyMethod | null {
  return typeof value === 'string' && value in FROM_API ? FROM_API[value as ApiMoneyMethod] : null
}

export function toApiMethod(method: MoneyMethod): ApiMoneyMethod {
  return TO_API[method]
}

export type MethodTotals = Record<MoneyMethod, number>

export function emptyMethodTotals(): MethodTotals {
  return { cash: 0, card: 0, yape: 0, plin: 0, transfer: 0, other: 0 }
}

/** `PaymentMethodTotalDto[]` → montos por método (los que no vienen quedan en 0). */
export function toMethodTotals(value: unknown): MethodTotals {
  const totals = emptyMethodTotals()

  for (const row of Array.isArray(value) ? value : []) {
    if (typeof row !== 'object' || row === null) continue
    const record = row as Record<string, unknown>
    const method = fromApiMethod(record.paymentMethod)
    if (method && typeof record.amount === 'number') totals[method] += record.amount
  }

  return totals
}
