import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export const useSessionStore = defineStore('session', () => {
  const restaurantId = ref<string | null>(null)
  const tableId = ref<string | null>(null)
  const accessToken = ref<string | null>(null)

  const hasRestaurantContext = computed(() => restaurantId.value !== null)
  const isAuthenticated = computed(() => accessToken.value !== null)

  function setTable(nextTableId: string): void {
    tableId.value = nextTableId
  }

  function setRestaurant(nextRestaurantId: string): void {
    restaurantId.value = nextRestaurantId
  }

  function clearSession(): void {
    restaurantId.value = null
    tableId.value = null
    accessToken.value = null
  }

  return {
    restaurantId,
    tableId,
    accessToken,
    hasRestaurantContext,
    isAuthenticated,
    setTable,
    setRestaurant,
    clearSession,
  }
})
