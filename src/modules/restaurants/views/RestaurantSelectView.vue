<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'

import SkeletonBlock from '@/components/base/SkeletonBlock.vue'
import DinerNotice from '@/components/feedback/DinerNotice.vue'
import { usePageTitle } from '@/composables/usePageTitle'
import { fetchRestaurants, isRestaurantOpen } from '@/modules/restaurants/api'
import RestaurantMap from '@/modules/restaurants/components/RestaurantMap.vue'
import type { MapPoint } from '@/modules/restaurants/components/RestaurantMap.vue'
import type { RestaurantSite } from '@/modules/restaurants/types'
import { useDinerStore } from '@/stores/diner'

usePageTitle('Restaurantes')

const diner = useDinerStore()
const router = useRouter()

const restaurants = ref<RestaurantSite[]>([])
const hasLoadError = ref(false)
const isLoading = ref(true)

const search = ref('')
const category = ref<string | null>(null)
const selectedId = ref<string | null>(null)

const userLocation = ref<MapPoint | null>(null)
const locating = ref(false)
const locationError = ref<string | null>(null)

/** Las sedes inactivas o suspendidas no se muestran al comensal. */
const openRestaurants = computed(() => restaurants.value.filter(isRestaurantOpen))

const categories = computed(() => [...new Set(openRestaurants.value.map((site) => site.categoryLabel))])

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

/** Distancia en km entre dos puntos (fórmula de haversine). */
function distanceKm(from: MapPoint, to: MapPoint): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(to.lat - from.lat)
  const dLng = toRad(to.lng - from.lng)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function distanceTo(site: RestaurantSite): number | null {
  if (!userLocation.value || typeof site.lat !== 'number' || typeof site.lng !== 'number') {
    return null
  }

  return distanceKm(userLocation.value, { lat: site.lat, lng: site.lng })
}

const kmFormat = new Intl.NumberFormat('es', { maximumFractionDigits: 1 })
const bigKmFormat = new Intl.NumberFormat('es', { maximumFractionDigits: 0 })

function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`
  }

  return `${(km < 100 ? kmFormat : bigKmFormat).format(km)} km`
}

/** Resultado de la búsqueda: filtra por texto y tipo; ordena por cercanía si hay ubicación. */
const results = computed(() => {
  const query = normalize(search.value.trim())

  const filtered = openRestaurants.value.filter((site) => {
    if (category.value && site.categoryLabel !== category.value) {
      return false
    }

    if (!query) {
      return true
    }

    return [site.name, site.city, site.cuisine, site.address, site.categoryLabel].some((field) =>
      normalize(field).includes(query),
    )
  })

  return filtered
    .map((site) => ({ site, distance: distanceTo(site) }))
    .sort((a, b) => {
      if (a.distance !== null && b.distance !== null) {
        return a.distance - b.distance
      }

      return a.site.name.localeCompare(b.site.name, 'es')
    })
})

const mapRestaurants = computed(() => results.value.map((item) => item.site))

const relativeTime = new Intl.RelativeTimeFormat('es', { numeric: 'auto' })

function formatVisitedAt(iso: string): string {
  const minutes = Math.round((new Date(iso).getTime() - Date.now()) / 60000)

  if (Math.abs(minutes) < 60) {
    return relativeTime.format(minutes, 'minute')
  }

  const hours = Math.round(minutes / 60)

  if (Math.abs(hours) < 24) {
    return relativeTime.format(hours, 'hour')
  }

  return relativeTime.format(Math.round(hours / 24), 'day')
}

/** Sedes abiertas hace poco, en el orden en que se visitaron. */
const recents = computed(() =>
  diner.recentRestaurants.flatMap((recent) => {
    const site = openRestaurants.value.find((item) => item.id === recent.id)
    return site ? [{ site, visitedAt: recent.visitedAt }] : []
  }),
)

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

function locate(): void {
  if (!('geolocation' in navigator)) {
    locationError.value = 'Tu navegador no permite compartir la ubicación.'
    return
  }

  locating.value = true
  locationError.value = null

  navigator.geolocation.getCurrentPosition(
    (position) => {
      userLocation.value = { lat: position.coords.latitude, lng: position.coords.longitude }
      selectedId.value = null
      locating.value = false
    },
    (error) => {
      locationError.value =
        error.code === error.PERMISSION_DENIED
          ? 'No diste permiso de ubicación. Puedes buscar por ciudad o nombre.'
          : 'No pudimos obtener tu ubicación. Inténtalo de nuevo.'
      locating.value = false
    },
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
  )
}

async function selectFromMap(id: string): Promise<void> {
  selectedId.value = id
  await nextTick()
  document.getElementById(`restaurant-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
}

async function browseMenu(restaurant: RestaurantSite): Promise<void> {
  if (!(diner.isReadyToOrder && diner.restaurantId === restaurant.id)) {
    diner.browse({
      restaurantId: restaurant.id,
      restaurantSlug: restaurant.slug,
      restaurantName: restaurant.name,
      currency: restaurant.currency,
    })
  }

  await router.push({ name: 'menu', params: { restaurantSlug: restaurant.slug } })
}

onMounted(async () => {
  void loadRestaurants()

  /* Si ya dio permiso antes, se ubica sin volver a preguntar. */
  try {
    const status = await navigator.permissions?.query({ name: 'geolocation' })

    if (status?.state === 'granted') {
      locate()
    }
  } catch {
    // API de permisos no disponible: se espera a que pulse "Cerca de mí".
  }
})
</script>

<template>
  <div class="mx-auto w-full space-y-6 py-1">
    <header class="space-y-1">
      <h1 class="font-headline text-3xl font-semibold tracking-tight text-on-surface">¿Dónde comemos hoy?</h1>
      <p class="text-sm text-on-surface-variant">
        Encuentra una sede cerca y mira su carta.
      </p>
    </header>

    <RouterLink
      v-if="diner.isReadyToOrder"
      class="flex min-h-20 items-center justify-between gap-3 rounded-3xl bg-primary px-5 py-4 text-on-primary shadow-md hover:bg-primary-container"
      :to="diner.attentionId ? { name: 'order-status', params: { attentionId: diner.attentionId } } : diner.menuRoute"
    >
      <span>
        <span class="font-label block text-xs font-bold tracking-widest uppercase opacity-80">Continuar en tu mesa</span>
        <span class="font-headline text-lg font-semibold">{{ diner.restaurantName }} · Mesa {{ diner.tableNumber }}</span>
      </span>
      <span aria-hidden="true">→</span>
    </RouterLink>

    <!-- Mapa con buscador flotante -->
    <section class="relative h-[22rem] overflow-hidden rounded-3xl shadow-sm ring-1 ring-outline-variant/50 sm:h-[26rem]">
      <RestaurantMap
        :restaurants="mapRestaurants"
        :selected-id="selectedId"
        :user-location="userLocation"
        @select="selectFromMap"
      />

      <div class="pointer-events-none absolute inset-x-3 top-3 z-10 flex gap-2">
        <label
          class="pointer-events-auto flex min-h-12 flex-1 items-center gap-2.5 rounded-2xl bg-surface-container-lowest/95 px-4 shadow-md ring-1 ring-outline-variant/50 backdrop-blur focus-within:ring-2 focus-within:ring-primary"
        >
          <svg class="h-5 w-5 shrink-0 text-outline" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <span class="sr-only">Buscar restaurantes</span>
          <input
            v-model="search"
            type="search"
            placeholder="Busca por nombre, ciudad o cocina"
            class="min-w-0 flex-1 bg-transparent text-sm text-on-surface placeholder:text-outline focus:outline-none"
          />
        </label>
      </div>

      <button
        type="button"
        class="font-label absolute bottom-3 left-3 z-10 inline-flex min-h-11 items-center gap-2 rounded-full bg-surface-container-lowest px-4 text-sm font-semibold text-on-surface shadow-md ring-1 ring-outline-variant/50 hover:bg-surface-container-low disabled:opacity-60"
        :disabled="locating"
        @click="locate"
      >
        <svg
          class="h-4 w-4 text-primary"
          :class="{ 'animate-spin': locating }"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m0 13.5V21m9-9h-2.25M5.25 12H3m15 0a6 6 0 1 1-12 0 6 6 0 0 1 12 0Zm-3.75 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
        </svg>
        {{ locating ? 'Buscando…' : userLocation ? 'Actualizar ubicación' : 'Cerca de mí' }}
      </button>
    </section>

    <p v-if="locationError" class="-mt-3 rounded-xl bg-warning-container px-4 py-2.5 text-sm text-on-warning-container" role="status">
      {{ locationError }}
    </p>

    <!-- Filtro por tipo de local -->
    <div v-if="categories.length > 1" class="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="group" aria-label="Tipo de local">
      <button
        v-for="option in [null, ...categories]"
        :key="option ?? 'all'"
        type="button"
        class="font-label min-h-10 shrink-0 rounded-full px-4 text-sm font-semibold transition-colors"
        :class="
          category === option
            ? 'bg-on-surface text-surface'
            : 'bg-surface-container-lowest text-on-surface-variant ring-1 ring-outline-variant/60 hover:bg-surface-container-low'
        "
        :aria-pressed="category === option"
        @click="category = option"
      >
        {{ option ?? 'Todos' }}
      </button>
    </div>

    <!-- Resultados -->
    <section aria-labelledby="results-title" class="space-y-3">
      <div class="flex items-baseline justify-between">
        <h2 id="results-title" class="font-headline text-xl font-semibold text-on-surface">
          {{ userLocation ? 'Cerca de ti' : 'Restaurantes' }}
        </h2>
        <span v-if="!isLoading && !hasLoadError" class="font-label text-xs text-on-surface-variant">
          {{ results.length }} {{ results.length === 1 ? 'sede' : 'sedes' }}
        </span>
      </div>

      <SkeletonBlock v-if="isLoading" :rows="3" />
      <DinerNotice v-else-if="hasLoadError" kind="connection" @retry="loadRestaurants" />
      <p v-else-if="results.length === 0" class="rounded-2xl bg-surface-container-low px-4 py-6 text-center text-sm text-on-surface-variant">
        {{ openRestaurants.length === 0 ? 'No hay sedes disponibles en este momento.' : 'No encontramos sedes con esa búsqueda.' }}
      </p>
      <ul v-else class="space-y-3">
        <li v-for="{ site, distance } in results" :id="`restaurant-${site.id}`" :key="site.id">
          <article
            class="flex cursor-pointer gap-4 rounded-2xl bg-surface-container-lowest p-3 shadow-sm ring-1 transition"
            :class="selectedId === site.id ? 'ring-2 ring-primary' : 'ring-outline-variant/40 hover:shadow-md'"
            @click="selectedId = site.id"
          >
            <img :src="site.imageUrl" :alt="site.name" class="h-24 w-24 shrink-0 rounded-xl object-cover sm:h-28 sm:w-32" loading="lazy" />
            <div class="flex min-w-0 flex-1 flex-col justify-between gap-2">
              <div class="min-w-0">
                <div class="flex items-start justify-between gap-2">
                  <h3 class="font-headline truncate text-base font-semibold text-on-surface">{{ site.name }}</h3>
                  <span
                    v-if="distance !== null"
                    class="font-label shrink-0 rounded-full bg-primary-fixed px-2 py-0.5 text-xs font-semibold text-on-primary-fixed"
                  >
                    {{ formatDistance(distance) }}
                  </span>
                </div>
                <p class="font-label truncate text-xs font-semibold tracking-wide text-tertiary uppercase">{{ site.cuisine }}</p>
                <p class="mt-1 line-clamp-1 text-xs text-on-surface-variant">{{ site.address }}</p>
              </div>
              <div class="flex items-center justify-between gap-2">
                <span class="text-xs text-on-surface-variant">{{ site.categoryLabel }}</span>
                <button
                  type="button"
                  class="font-label min-h-10 rounded-xl bg-primary px-4 text-sm font-semibold text-on-primary shadow-sm hover:bg-primary-container"
                  @click.stop="browseMenu(site)"
                >
                  Ver carta
                </button>
              </div>
            </div>
          </article>
        </li>
      </ul>
    </section>

    <!-- Recientes -->
    <section aria-labelledby="recent-title" class="space-y-3">
      <h2 id="recent-title" class="font-headline text-xl font-semibold text-on-surface">Recientes</h2>
      <p v-if="recents.length === 0" class="rounded-2xl border border-dashed border-outline-variant px-4 py-6 text-center text-sm text-on-surface-variant">
        Aquí verás las sedes que visites o cuya carta consultes.
      </p>
      <ul v-else class="divide-y divide-outline-variant/50 overflow-hidden rounded-2xl bg-surface-container-lowest shadow-sm ring-1 ring-outline-variant/40">
        <li v-for="{ site, visitedAt } in recents" :key="site.id">
          <button
            type="button"
            class="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-container-low"
            @click="browseMenu(site)"
          >
            <img :src="site.imageUrl" :alt="''" class="h-11 w-11 shrink-0 rounded-lg object-cover" loading="lazy" />
            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm font-semibold text-on-surface">{{ site.name }}</span>
              <span class="block truncate text-xs text-on-surface-variant">{{ site.city }} · {{ formatVisitedAt(visitedAt) }}</span>
            </span>
            <svg class="h-4 w-4 shrink-0 text-outline" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </li>
      </ul>
    </section>

    <p class="pt-2 text-center text-sm text-on-surface-variant">
      ¿Trabajas en un restaurante?
      <RouterLink class="font-semibold text-primary underline-offset-2 hover:underline" :to="{ name: 'login' }">Acceso del personal</RouterLink>
    </p>
  </div>
</template>
