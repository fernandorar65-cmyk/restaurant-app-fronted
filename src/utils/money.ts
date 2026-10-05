const formatters = new Map<string, Intl.NumberFormat>()

function formatterFor(currency: string): Intl.NumberFormat {
  const cached = formatters.get(currency)

  if (cached) {
    return cached
  }

  let formatter: Intl.NumberFormat

  try {
    formatter = new Intl.NumberFormat('es', { style: 'currency', currency })
  } catch {
    formatter = new Intl.NumberFormat('es', { style: 'currency', currency: 'EUR' })
  }

  formatters.set(currency, formatter)
  return formatter
}

export function formatMoney(amount: number, currency = 'EUR'): string {
  return formatterFor(currency).format(amount)
}

export function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100
}

export const MONEY_EPSILON = 0.001
