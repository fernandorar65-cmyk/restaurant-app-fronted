export interface ApiResponse<T> {
  success: boolean
  statusCode: number
  message: string | string[]
  data: T
  timestamp: string
  path: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function isApiResponse(value: unknown): value is ApiResponse<unknown> {
  return isRecord(value) && typeof value.success === 'boolean' && 'data' in value
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
