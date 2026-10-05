import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import { fetchRestaurantById } from '@/modules/restaurants/api'
import type { RestaurantSite } from '@/modules/restaurants/types'
import { HttpError } from '@/services/http'
import { useSessionStore } from '@/stores/session'

/**
 * Sede de la ruta actual (`:restaurantId`) para las vistas del portal. Fija la
 * sede activa en la sesión y llama a `onReady` cada vez que cambia.
 */
export function useSiteContext(onReady: (site: RestaurantSite) => Promise<void> | void) {
  const route = useRoute()
  const session = useSessionStore()

  const restaurant = ref<RestaurantSite | null>(null)
  const isLoading = ref(true)
  const loadError = ref<string | null>(null)

  const restaurantId = computed(() => {
    const value = route.params.restaurantId
    return typeof value === 'string' ? value : null
  })

  const currency = computed(() => restaurant.value?.currency ?? 'EUR')

  async function load(): Promise<void> {
    const id = restaurantId.value
    isLoading.value = true
    loadError.value = null

    if (!id) {
      loadError.value = 'No se indicó una sede.'
      isLoading.value = false
      return
    }

    session.setRestaurant(id)

    try {
      const site = await fetchRestaurantById(id)
      restaurant.value = site

      if (!site) {
        loadError.value = 'La sede no existe.'
        return
      }

      await onReady(site)
    } catch (error) {
      loadError.value = error instanceof HttpError ? error.message : 'No se pudieron cargar los datos de la sede.'
    } finally {
      isLoading.value = false
    }
  }

  watch(restaurantId, () => void load(), { immediate: true })

  return { restaurant, restaurantId, currency, isLoading, loadError, reload: load }
}
