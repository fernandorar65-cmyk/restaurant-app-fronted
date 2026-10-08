export function minutesSince(isoDate: string, now: number = Date.now()): number {
  return Math.max(Math.floor((now - new Date(isoDate).getTime()) / 60000), 0)
}

export function formatElapsed(isoDate: string, now: number = Date.now()): string {
  const minutes = minutesSince(isoDate, now)

  if (minutes < 1) {
    return 'recién'
  }

  if (minutes < 60) {
    return `hace ${minutes} min`
  }

  const hours = Math.floor(minutes / 60)
  return `hace ${hours} h ${minutes % 60} min`
}

export function formatTime(isoDate: string, timeZone?: string): string {
  return new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit', timeZone }).format(new Date(isoDate))
}

export function formatDateTime(isoDate: string, timeZone?: string): string {
  return new Intl.DateTimeFormat('es', { dateStyle: 'short', timeStyle: 'short', timeZone }).format(new Date(isoDate))
}

/** Fecha local (YYYY-MM-DD) de un instante en la zona horaria de la sede. */
/** "2026-09-20T18:30:00Z" → "septiembre de 2026". Para fechas de alta ("miembro desde"). */
export function formatMonthYear(isoDate: string): string {
  return new Intl.DateTimeFormat('es', { month: 'long', year: 'numeric' }).format(new Date(isoDate))
}

export function localDateKey(isoDate: string, timeZone?: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(
    new Date(isoDate),
  )
}

export function createId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`
}
