import { USER_KEY } from '@/modules/auth/storage'
import { HttpError } from './client'

/**
 * Organización sobre la que actúa el personal. Muchas rutas del panel la piden
 * (`organizationId`) y sin ella responden `400 TENANT_SCOPE_REQUIRED`.
 * Se lee del usuario guardado al iniciar sesión (ver `useSessionStore`).
 */
export function currentOrganizationId(): string | null {
  try {
    const raw = localStorage.getItem(USER_KEY) ?? sessionStorage.getItem(USER_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : null

    if (typeof parsed === 'object' && parsed !== null && 'organizationId' in parsed) {
      const id = (parsed as { organizationId: unknown }).organizationId
      return typeof id === 'string' && id ? id : null
    }
  } catch {
    // Sin almacenamiento o dato dañado.
  }

  return null
}

export function requireOrganizationId(): string {
  const id = currentOrganizationId()

  if (!id) {
    throw new HttpError('Tu usuario no pertenece a ninguna organización.', 400, 'TENANT_SCOPE_REQUIRED')
  }

  return id
}
