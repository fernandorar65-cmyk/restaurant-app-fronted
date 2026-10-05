<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'

import DinerNotice from '@/components/feedback/DinerNotice.vue'
import { usePageTitle } from '@/composables/usePageTitle'
import { fetchRestaurants, isRestaurantOpen } from '@/modules/restaurants/api'
import MenuRestaurantCard from '@/modules/restaurants/components/MenuRestaurantCard.vue'
import type { RestaurantSite } from '@/modules/restaurants/types'
import { useDinerStore } from '@/stores/diner'

usePageTitle('Restaurantes')

const diner = useDinerStore()
const router = useRouter()

const restaurants = ref<RestaurantSite[]>([])
const hasLoadError = ref(false)
const isLoading = ref(true)

/** Las sedes inactivas o suspendidas no se muestran al comensal. */
const openRestaurants = computed(() => restaurants.value.filter(isRestaurantOpen))

async function loadRestaurants(): Promise<void> {
  isLoading.value = true
  hasLoadError.value = false

  try {
    restaurants.value = await fetchRestaurants()
  } catch {
    hasLoadError.value = true
  } finally {
    isLoading.value = false
  }
}

async function browseMenu(restaurant: RestaurantSite): Promise<void> {
  if (!(diner.isReadyToOrder && diner.restaurantId === restaurant.id)) {
    diner.browse({ restaurantId: restaurant.id, restaurantName: restaurant.name, currency: restaurant.currency })
  }

  await router.push({ name: 'menu' })
}

onMounted(() => {
  void loadRestaurants()
})
</script>

<template>
  <div class="mx-auto w-full max-w-4xl space-y-6 px-1 py-2">
    <div class="space-y-1.5 text-center">
      <p class="font-label text-[11px] font-bold tracking-widest text-primary uppercase">Restaurant CMR</p>
      <h1 class="font-headline text-2xl font-semibold tracking-tight text-on-surface sm:text-3xl">
        Pide desde tu mesa
      </h1>
      <p class="text-sm text-on-surface-variant">
        Escanea el código QR de tu mesa para pedir. Aquí puedes consultar la carta de cada sede.
      </p>
    </div>

    <RouterLink
      v-if="diner.isReadyToOrder"
      class="flex items-center justify-between gap-3 rounded-2xl bg-primary px-5 py-4 text-on-primary shadow-sm hover:bg-primary-container"
      :to="diner.attentionId ? { name: 'order-status', params: { attentionId: diner.attentionId } } : { name: 'menu' }"
    >
      <span>
        <span class="font-label block text-[11px] font-bold tracking-widest uppercase opacity-80">Continuar en tu mesa</span>
        <span class="font-headline text-lg font-semibold">{{ diner.restaurantName }} · Mesa {{ diner.tableNumber }}</span>
      </span>
      <span aria-hidden="true">→</span>
    </RouterLink>

    <p v-if="isLoading" class="text-center text-sm text-on-surface-variant">Cargando restaurantes…</p>
    <DinerNotice v-else-if="hasLoadError" kind="connection" @retry="loadRestaurants" />
    <p v-else-if="openRestaurants.length === 0" class="text-center text-sm text-on-surface-variant">
      No hay sedes disponibles en este momento.
    </p>
    <div v-else class="grid grid-cols-1 gap-5 sm:grid-cols-2">
      <MenuRestaurantCard
        v-for="restaurant in openRestaurants"
        :key="restaurant.id"
        :restaurant="restaurant"
        :is-selected="diner.restaurantId === restaurant.id"
        @enter="browseMenu(restaurant)"
      />
    </div>
  </div>
</template>
