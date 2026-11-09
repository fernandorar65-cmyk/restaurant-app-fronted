export interface ApiResponse<T> {
  success: boolean
  statusCode: number
  message: string | string[]
  data: T
  timestamp: string
  path: string
  errorCode?: string
  requestId?: string
}

/** Listado paginado del API: `{ items, meta }`. */
export interface PageMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface Page<T> {
  items: T[]
  meta: PageMeta
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function isApiResponse(value: unknown): value is ApiResponse<unknown> {
  return isRecord(value) && typeof value.success === 'boolean' && 'data' in value
}

export function isPage(value: unknown): value is Page<unknown> {
  return isRecord(value) && Array.isArray(value.items) && isRecord(value.meta)
}

export function getApiErrorCode(payload: unknown): string | null {
  return isRecord(payload) && typeof payload.errorCode === 'string' ? payload.errorCode : null
}

export function getApiErrorMessage(payload: unknown, fallback: string): string {
  if (!isRecord(payload)) {
    return fallback
  }

  const message = payload.message

  if (typeof message === 'string' && message.trim().length > 0) {
    return message
  }

  if (Array.isArray(message) && typeof message[0] === 'string') {
    return message[0]
  }

  return fallback
}
