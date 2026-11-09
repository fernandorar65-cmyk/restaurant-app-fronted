import { appConfig } from '@/app/config/env'
import {
  clearTokens,
  getAccessToken,
  getGuestToken,
  getRefreshToken,
  storeTokens,
  type TokenScope,
} from '@/modules/auth/storage'
import { getApiErrorCode, getApiErrorMessage, isApiResponse, isPage, type Page } from '@/services/http/api-response'

export class HttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    /** `errorCode` del API (p. ej. `PRODUCT_NOT_FOUND`). */
    public readonly code: string | null = null,
    /** `X-Request-Id` de la respuesta, para reportar el error. */
    public readonly requestId: string | null = null,
  ) {
    super(message)
    this.name = 'HttpError'
  }
}

export type QueryValue = string | number | boolean | null | undefined | readonly (string | number)[]

export type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown
  /** Query string; se omiten `undefined`, `null` y `''`. */
  query?: Record<string, QueryValue>
  /**
   * Qué sesión envía. Por defecto: `customer` en `/api/v1/*` (salvo `/api/v1/owner/*`),
   * `staff` en el resto. `none` no envía Authorization.
   */
  auth?: TokenScope | 'none'
  /** Atención cuyo `X-Guest-Token` se envía (comensal invitado). */
  guestAttentionId?: string | null
}

/** Se dispara cuando la sesión venció y no se pudo renovar. */
export const SESSION_EXPIRED_EVENT = 'restaurant-cmr:session-expired'

function defaultScope(path: string): TokenScope {
  return path.startsWith('/api/v1/') && !path.startsWith('/api/v1/owner/') ? 'customer' : 'staff'
}

const REFRESH_PATH: Record<TokenScope, string> = {
  staff: '/api/v1/owner/auth/refresh',
  customer: '/api/v1/customer/auth/refresh',
}

/** Un solo refresh en vuelo por sesión: el refresh token es de un solo uso. */
const refreshing: Partial<Record<TokenScope, Promise<boolean>>> = {}

function refreshSession(scope: TokenScope): Promise<boolean> {
  const pending = refreshing[scope]

  if (pending) {
    return pending
  }

  const run = (async () => {
    const refreshToken = getRefreshToken(scope)

    if (!refreshToken) {
      return false
    }

    try {
      const response = await fetch(`${appConfig.apiBaseUrl}${REFRESH_PATH[scope]}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })
      const payload = await readPayload(response)
      const data = isApiResponse(payload) ? (payload.data as Record<string, unknown> | null) : null

      if (!response.ok || !data || typeof data.accessToken !== 'string' || typeof data.refreshToken !== 'string') {
        return false
      }

      storeTokens(scope, { accessToken: data.accessToken, refreshToken: data.refreshToken })
      return true
    } catch {
      return false
    }
  })()

  refreshing[scope] = run
  void run.finally(() => {
    delete refreshing[scope]
  })

  return run
}

export function buildQuery(query: Record<string, QueryValue> | undefined): string {
  if (!query) {
    return ''
  }

  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') {
      continue
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        params.append(key, String(item))
      }
    } else {
      params.set(key, String(value))
    }
  }

  const text = params.toString()
  return text ? `?${text}` : ''
}

async function send(path: string, options: RequestOptions, scope: TokenScope | 'none'): Promise<Response> {
  const { body, query, auth: _auth, guestAttentionId, ...init } = options
  const headers = new Headers(init.headers)

  if (body !== undefined && !(body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  if (scope !== 'none' && !headers.has('Authorization')) {
    const accessToken = getAccessToken(scope)

    if (accessToken) {
      headers.set('Authorization', `Bearer ${accessToken}`)
    }
  }

  if (guestAttentionId && !headers.has('X-Guest-Token')) {
    const guestToken = getGuestToken(guestAttentionId)

    if (guestToken) {
      headers.set('X-Guest-Token', guestToken)
    }
  }

  return fetch(`${appConfig.apiBaseUrl}${path}${buildQuery(query)}`, {
    ...init,
    headers,
    body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
  })
}

/** Petición al API. Devuelve `data` del sobre de respuesta. */
export async function http<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const scope = options.auth ?? defaultScope(path)
  let response = await send(path, options, scope)
  let payload = await readPayload(response)

  if (response.status === 401 && scope !== 'none' && getApiErrorCode(payload) !== 'INVALID_CREDENTIALS') {
    if (getRefreshToken(scope) && (await refreshSession(scope))) {
      response = await send(path, options, scope)
      payload = await readPayload(response)
    } else if (getAccessToken(scope)) {
      clearTokens(scope)
      window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT, { detail: { scope } }))
    }
  }

  if (!response.ok) {
    throw new HttpError(
      getApiErrorMessage(payload, `La petición a ${path} falló`),
      response.status,
      getApiErrorCode(payload),
      response.headers.get('X-Request-Id'),
    )
  }

  if (response.status === 204) {
    return undefined as T
  }

  if (isApiResponse(payload)) {
    return payload.data as T
  }

  return payload as T
}

/** Una página de un listado paginado. */
export async function httpPage<T>(path: string, options: RequestOptions = {}): Promise<Page<T>> {
  const data = await http<unknown>(path, options)

  if (isPage(data)) {
    return data as Page<T>
  }

  const items = Array.isArray(data) ? (data as T[]) : []
  return { items, meta: { page: 1, limit: items.length, total: items.length, totalPages: 1 } }
}

/**
 * Todas las páginas de un listado (máximo 100 por página). Para catálogos
 * y listados acotados; no usar en históricos que pueden crecer sin límite.
 */
export async function httpAll<T>(path: string, options: RequestOptions = {}, maxPages = 50): Promise<T[]> {
  const items: T[] = []
  let page = 1

  while (page <= maxPages) {
    const result = await httpPage<T>(path, { ...options, query: { ...options.query, page, limit: 100 } })
    items.push(...result.items)

    if (page >= result.meta.totalPages || result.items.length === 0) {
      break
    }

    page += 1
  }

  return items
}

/** UUID para `requestId` (reintentos seguros de órdenes y pagos). */
export function newRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0
    return (char === 'x' ? random : (random & 0x3) | 0x8).toString(16)
  })
}

async function readPayload(response: Response): Promise<unknown> {
  const contentType = response.headers.get('Content-Type') ?? ''

  if (response.status === 204 || !contentType.includes('application/json')) {
    return null
  }

  try {
    return await response.json()
  } catch {
    return null
  }
}
