import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

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
      return {
        id: parsed.id,
        name: parsed.name,
        email: parsed.email,
      }
    }
  } catch {
    localStorage.removeItem(USER_KEY)
  }

  return null
}

export const useSessionStore = defineStore('session', () => {
  const restaurantId = ref<string | null>(null)
  const tableId = ref<string | null>(null)
  const accessToken = ref<string | null>(localStorage.getItem(ACCESS_TOKEN_KEY))
  const user = ref<AuthUser | null>(readStoredUser())

  const hasRestaurantContext = computed(() => restaurantId.value !== null)
  const isAuthenticated = computed(() => accessToken.value !== null && user.value !== null)

  function setTable(nextTableId: string): void {
    tableId.value = nextTableId
  }

  function setRestaurant(nextRestaurantId: string): void {
    restaurantId.value = nextRestaurantId
  }

  function setSession(session: AuthSession, options: { persist?: boolean } = {}): void {
    const persist = options.persist ?? true

    accessToken.value = session.accessToken
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
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  }

  function clearSession(): void {
    restaurantId.value = null
    tableId.value = null
    clearAuth()
  }

  return {
    restaurantId,
    tableId,
    accessToken,
    user,
    hasRestaurantContext,
    isAuthenticated,
    setTable,
    setRestaurant,
    setSession,
    clearAuth,
    clearSession,
  }
})
