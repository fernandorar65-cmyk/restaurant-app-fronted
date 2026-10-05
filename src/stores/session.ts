import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { refreshAuthUser } from '@/modules/auth/api'
import { ADMIN_PERMISSIONS, isPermission, SITE_PERMISSIONS } from '@/modules/auth/permissions'
import type { Permission } from '@/modules/auth/permissions'
import type { AuthSession, AuthUser } from '@/modules/auth/types'
import { ACCESS_TOKEN_KEY, USER_KEY } from '@/modules/auth/storage'

function readStoredUser(): AuthUser | null {
  const rawUser = localStorage.getItem(USER_KEY)

  if (!rawUser) {
    return null
  }

  try {
    const parsed: unknown = JSON.parse(rawUser)

    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'id' in parsed &&
      'name' in parsed &&
      'email' in parsed &&
      typeof parsed.id === 'string' &&
      typeof parsed.name === 'string' &&
      typeof parsed.email === 'string'
    ) {
      const record = parsed as Record<string, unknown>

      return {
        id: parsed.id,
        name: parsed.name,
        email: parsed.email,
        roleId: typeof record.roleId === 'string' ? record.roleId : null,
        roleName: typeof record.roleName === 'string' ? record.roleName : null,
        permissions: Array.isArray(record.permissions) ? record.permissions.filter(isPermission) : [],
        restaurantIds: Array.isArray(record.restaurantIds)
          ? record.restaurantIds.filter((id): id is string => typeof id === 'string')
          : [],
        employeeId: typeof record.employeeId === 'string' ? record.employeeId : null,
      }
    }
  } catch {
    localStorage.removeItem(USER_KEY)
  }

  return null
}

/** Sesión del personal del restaurante (lado de gestión). El contexto del comensal vive en `useDinerStore`. */
export const useSessionStore = defineStore('session', () => {
  const restaurantId = ref<string | null>(null)
  const accessToken = ref<string | null>(localStorage.getItem(ACCESS_TOKEN_KEY))
  const user = ref<AuthUser | null>(readStoredUser())
  const persistSession = ref(localStorage.getItem(ACCESS_TOKEN_KEY) !== null)

  const hasRestaurantContext = computed(() => restaurantId.value !== null)
  const isAuthenticated = computed(() => accessToken.value !== null && user.value !== null)
  const permissions = computed(() => user.value?.permissions ?? [])
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

    if (persistSession.value) {
      localStorage.setItem(USER_KEY, JSON.stringify(nextUser))
    }
  }

  function setSession(session: AuthSession, options: { persist?: boolean } = {}): void {
    const persist = options.persist ?? true

    accessToken.value = session.accessToken
    persistSession.value = persist
    user.value = session.user

    if (!persist) {
      localStorage.removeItem(ACCESS_TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
      return
    }

    localStorage.setItem(ACCESS_TOKEN_KEY, session.accessToken)
    localStorage.setItem(USER_KEY, JSON.stringify(session.user))
  }

  function clearAuth(): void {
    accessToken.value = null
    user.value = null
    restaurantId.value = null
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  }

  /**
   * Relee usuario y rol desde el API. Devuelve false si la cuenta fue bloqueada,
   * desactivada o eliminada (y cierra la sesión).
   */
  async function refreshUser(): Promise<boolean> {
    if (!user.value) {
      return false
    }

    const fresh = await refreshAuthUser(user.value.id)

    if (!fresh) {
      clearAuth()
      return false
    }

    storeUser(fresh)
    return true
  }

  return {
    restaurantId,
    accessToken,
    user,
    permissions,
    hasRestaurantContext,
    isAuthenticated,
    hasSiteAccess,
    hasAdminAccess,
    can,
    canAccessRestaurant,
    setRestaurant,
    setSession,
    clearAuth,
    refreshUser,
  }
})
