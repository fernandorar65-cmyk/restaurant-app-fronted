import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { logout, refreshAuthUser } from '@/modules/auth/api'
import { ADMIN_PERMISSIONS, isPermission, SITE_PERMISSIONS } from '@/modules/auth/permissions'
import type { Permission } from '@/modules/auth/permissions'
import type { AuthSession, AuthUser } from '@/modules/auth/types'
import { clearTokens, getAccessToken, USER_KEY } from '@/modules/auth/storage'
import { SESSION_EXPIRED_EVENT } from '@/services/http'

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value ? value : null
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function readRawUser(): string | null {
  try {
    return localStorage.getItem(USER_KEY) ?? sessionStorage.getItem(USER_KEY)
  } catch {
    return null
  }
}

function readStoredUser(): AuthUser | null {
  const rawUser = readRawUser()

  if (!rawUser) {
    return null
  }

  try {
    const parsed: unknown = JSON.parse(rawUser)

    if (typeof parsed === 'object' && parsed !== null) {
      const record = parsed as Record<string, unknown>

      if (typeof record.id === 'string' && typeof record.name === 'string' && typeof record.email === 'string') {
        return {
          id: record.id,
          name: record.name,
          email: record.email,
          roleId: stringOrNull(record.roleId),
          roleName: stringOrNull(record.roleName),
          roleCode: stringOrNull(record.roleCode),
          permissions: Array.isArray(record.permissions) ? record.permissions.filter(isPermission) : [],
          apiPermissions: stringList(record.apiPermissions),
          restaurantIds: stringList(record.restaurantIds),
          employeeId: stringOrNull(record.employeeId),
          organizationId: stringOrNull(record.organizationId),
          organizationName: stringOrNull(record.organizationName),
          membershipId: stringOrNull(record.membershipId),
          isPlatformAdmin: record.isPlatformAdmin === true,
        }
      }
    }
  } catch {
    // Dato dañado: se descarta abajo.
  }

  removeStoredUser()
  return null
}

function removeStoredUser(): void {
  try {
    localStorage.removeItem(USER_KEY)
    sessionStorage.removeItem(USER_KEY)
  } catch {
    // Sin almacenamiento.
  }
}

function writeStoredUser(user: AuthUser, persist: boolean): void {
  try {
    removeStoredUser()
    ;(persist ? localStorage : sessionStorage).setItem(USER_KEY, JSON.stringify(user))
  } catch {
    // Sin almacenamiento: la sesión dura lo que la pestaña.
  }
}

/** Sesión del personal del restaurante (lado de gestión). El contexto del comensal vive en `useDinerStore`. */
export const useSessionStore = defineStore('session', () => {
  const restaurantId = ref<string | null>(null)
  const accessToken = ref<string | null>(getAccessToken('staff'))
  const user = ref<AuthUser | null>(accessToken.value ? readStoredUser() : null)
  const persistSession = ref(readRawUser() !== null && (() => {
    try {
      return localStorage.getItem(USER_KEY) !== null
    } catch {
      return true
    }
  })())

  const hasRestaurantContext = computed(() => restaurantId.value !== null)
  const isAuthenticated = computed(() => accessToken.value !== null && user.value !== null)
  const permissions = computed(() => user.value?.permissions ?? [])
  const organizationId = computed(() => user.value?.organizationId ?? null)
  const hasSiteAccess = computed(() => permissions.value.some((permission) => SITE_PERMISSIONS.includes(permission)))
  const hasAdminAccess = computed(() => permissions.value.some((permission) => ADMIN_PERMISSIONS.includes(permission)))

  function can(permission: Permission): boolean {
    return permissions.value.includes(permission)
  }

  function canAccessRestaurant(id: string): boolean {
    const allowed = user.value?.restaurantIds ?? []
    return allowed.length === 0 || allowed.includes(id)
  }

  function setRestaurant(nextRestaurantId: string): void {
    restaurantId.value = nextRestaurantId
  }

  function storeUser(nextUser: AuthUser): void {
    user.value = nextUser
    writeStoredUser(nextUser, persistSession.value)
  }

  /** Los tokens ya los guardó `login`/`register` en `auth/storage`. */
  function setSession(session: AuthSession, options: { persist?: boolean } = {}): void {
    persistSession.value = options.persist ?? true
    accessToken.value = session.accessToken
    storeUser(session.user)
  }

  function clearAuth(): void {
    accessToken.value = null
    user.value = null
    restaurantId.value = null
    removeStoredUser()
    clearTokens('staff')
  }

  /** Cierra la sesión en el servidor (invalida el refresh token) y en el cliente. */
  async function signOut(): Promise<void> {
    await logout()
    clearAuth()
  }

  /**
   * Relee el perfil desde el API. Devuelve false si la cuenta fue bloqueada,
   * desactivada o perdió la sesión (y la cierra).
   */
  async function refreshUser(): Promise<boolean> {
    if (!user.value) {
      return false
    }

    const fresh = await refreshAuthUser(user.value.organizationId)

    if (!fresh) {
      clearAuth()
      return false
    }

    accessToken.value = getAccessToken('staff')
    storeUser(fresh)
    return true
  }

  if (typeof window !== 'undefined') {
    window.addEventListener(SESSION_EXPIRED_EVENT, (event) => {
      if ((event as CustomEvent<{ scope: string }>).detail?.scope === 'staff') {
        clearAuth()
      }
    })
  }

  return {
    restaurantId,
    accessToken,
    user,
    permissions,
    organizationId,
    hasRestaurantContext,
    isAuthenticated,
    hasSiteAccess,
    hasAdminAccess,
    can,
    canAccessRestaurant,
    setRestaurant,
    setSession,
    clearAuth,
    signOut,
    refreshUser,
  }
})
