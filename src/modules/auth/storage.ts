/** Sesión del personal (panel). */
export const ACCESS_TOKEN_KEY = 'restaurant-cmr.accessToken'
export const REFRESH_TOKEN_KEY = 'restaurant-cmr.refreshToken'
export const USER_KEY = 'restaurant-cmr.user'

/** Sesión del comensal (app del cliente). Es la misma identidad, pero otra sesión. */
export const CUSTOMER_ACCESS_TOKEN_KEY = 'restaurant-cmr.customer.accessToken'
export const CUSTOMER_REFRESH_TOKEN_KEY = 'restaurant-cmr.customer.refreshToken'

/** Tokens de invitado por atención: `{ [attentionId]: guestToken }`. */
export const GUEST_TOKENS_KEY = 'restaurant-cmr.guestTokens'

export type TokenScope = 'staff' | 'customer'

const KEYS: Record<TokenScope, { access: string; refresh: string }> = {
  staff: { access: ACCESS_TOKEN_KEY, refresh: REFRESH_TOKEN_KEY },
  customer: { access: CUSTOMER_ACCESS_TOKEN_KEY, refresh: CUSTOMER_REFRESH_TOKEN_KEY },
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key) ?? sessionStorage.getItem(key)
  } catch {
    return null
  }
}

export function getAccessToken(scope: TokenScope): string | null {
  return read(KEYS[scope].access)
}

export function getRefreshToken(scope: TokenScope): string | null {
  return read(KEYS[scope].refresh)
}

/**
 * Guarda el par de tokens. `persist: false` los deja en sessionStorage
 * (se pierden al cerrar el navegador). Si no se indica, conserva dónde estaban.
 */
export function storeTokens(
  scope: TokenScope,
  tokens: { accessToken: string; refreshToken: string },
  options: { persist?: boolean } = {},
): void {
  const { access, refresh } = KEYS[scope]
  let persist = options.persist

  if (persist === undefined) {
    try {
      persist = sessionStorage.getItem(access) === null
    } catch {
      persist = true
    }
  }

  try {
    const target = persist ? localStorage : sessionStorage
    const other = persist ? sessionStorage : localStorage
    other.removeItem(access)
    other.removeItem(refresh)
    target.setItem(access, tokens.accessToken)
    target.setItem(refresh, tokens.refreshToken)
  } catch {
    // Almacenamiento no disponible: la sesión dura lo que la pestaña.
  }
}

export function clearTokens(scope: TokenScope): void {
  const { access, refresh } = KEYS[scope]

  try {
    for (const storage of [localStorage, sessionStorage]) {
      storage.removeItem(access)
      storage.removeItem(refresh)
    }
  } catch {
    // Sin almacenamiento: nada que limpiar.
  }
}

function readGuestTokens(): Record<string, string> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(GUEST_TOKENS_KEY) ?? '{}')
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, string>) : {}
  } catch {
    return {}
  }
}

export function getGuestToken(attentionId: string): string | null {
  return readGuestTokens()[attentionId] ?? null
}

export function storeGuestToken(attentionId: string, token: string): void {
  try {
    localStorage.setItem(GUEST_TOKENS_KEY, JSON.stringify({ ...readGuestTokens(), [attentionId]: token }))
  } catch {
    // Sin almacenamiento: el invitado pierde el acceso al recargar.
  }
}
