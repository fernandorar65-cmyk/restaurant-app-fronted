<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import { useRouter } from 'vue-router'

import { siteLandingRoute } from '@/app/router/landing'
import { usePageTitle } from '@/composables/usePageTitle'
import { fetchOrganizations, fetchRestaurants } from '@/modules/restaurants/api'
import RestaurantSiteCard from '@/modules/restaurants/components/RestaurantSiteCard.vue'
import type { Organization, RestaurantCategory, RestaurantSite } from '@/modules/restaurants/types'
import { HttpError } from '@/services/http'
import { useSessionStore } from '@/stores/session'

usePageTitle('Sedes')

const session = useSessionStore()
const router = useRouter()

const restaurants = ref<RestaurantSite[]>([])
const organization = ref<Organization | null>(null)
const loadError = ref<string | null>(null)
const isLoading = ref(true)
const searchQuery = ref('')
const activeCategory = ref<'all' | RestaurantCategory>('all')

const categoryFilters = computed(() => {
  const counts = {
    all: restaurants.value.length,
    'fine-dining': restaurants.value.filter((site) => site.category === 'fine-dining').length,
    bistro: restaurants.value.filter((site) => site.category === 'bistro').length,
    lab: restaurants.value.filter((site) => site.category === 'lab').length,
  }

  return [
    { id: 'all' as const, label: `Todas las sedes (${counts.all})` },
    { id: 'fine-dining' as const, label: `Alta cocina (${counts['fine-dining']})` },
    { id: 'bistro' as const, label: `Cava y bistró (${counts.bistro})` },
    { id: 'lab' as const, label: `I+D y laboratorio (${counts.lab})` },
  ]
})

const filteredRestaurants = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()

  return restaurants.value.filter((site) => {
    const matchesCategory = activeCategory.value === 'all' || site.category === activeCategory.value

    if (!matchesCategory) {
      return false
    }

    if (!query) {
      return true
    }

    return (
      site.name.toLowerCase().includes(query) ||
      site.city.toLowerCase().includes(query) ||
      site.code.toLowerCase().includes(query)
    )
  })
})

async function loadDirectory(): Promise<void> {
  isLoading.value = true
  loadError.value = null

  try {
    const [sites, organizations] = await Promise.all([fetchRestaurants(), fetchOrganizations()])
    // Cada usuario ve solo las sedes a las que tiene acceso.
    restaurants.value = sites.filter((site) => session.canAccessRestaurant(site.id))
    organization.value = organizations[0] ?? null
  } catch (error) {
    loadError.value =
      error instanceof HttpError ? error.message : 'No se pudo cargar el directorio de sedes.'
  } finally {
    isLoading.value = false
  }
}

async function enterSite(site: RestaurantSite): Promise<void> {
  session.setRestaurant(site.id)
  await router.push(siteLandingRoute(session.user, site.id) ?? { name: 'no-access' })
}

onMounted(() => {
  void loadDirectory()
})
</script>

<template>
  <div class="mx-auto max-w-7xl space-y-6 px-6 pt-8 lg:px-8">
    <section class="space-y-6 rounded-lg border border-outline-variant/60 bg-surface-container-lowest p-6 shadow-sm">
      <div class="flex flex-col justify-between gap-4 border-b border-outline-variant/60 pb-5 md:flex-row md:items-center">
        <div>
          <div class="mb-1 flex items-center gap-2">
            <span class="inline-block h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
            <span class="font-label text-xs font-bold tracking-widest text-primary uppercase">
              Panel de selección
            </span>
          </div>
          <h1 class="font-headline text-2xl font-semibold tracking-tight text-on-surface sm:text-3xl">
            Directorio de sedes operativas
          </h1>
          <p class="mt-0.5 text-xs text-on-surface-variant sm:text-sm">
            Elige la sede desde la que vas a operar. Los indicadores son de demostración hasta conectar el API.
          </p>
        </div>

        <div
          v-if="organization"
          class="flex items-center justify-between gap-4 rounded border border-outline-variant/60 bg-surface-container-low p-2.5 sm:justify-start sm:px-4 sm:py-2.5"
        >
          <div class="flex items-center gap-3">
            <div
              class="flex h-9 w-9 items-center justify-center rounded border border-outline-variant/60 bg-surface-container-lowest text-primary"
              aria-hidden="true"
            >
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21"
                />
              </svg>
            </div>
            <div class="flex flex-col">
              <span class="font-label text-xs font-bold tracking-wider text-outline uppercase">
                Organización
              </span>
              <span class="text-xs font-semibold text-on-surface">{{ organization.name }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div class="flex flex-col justify-between rounded border border-outline-variant/60 bg-surface-container-low p-4">
          <span class="font-label text-xs font-semibold tracking-wider text-on-surface-variant uppercase">Sedes</span>
          <span class="font-headline text-2xl font-bold text-on-surface">{{ restaurants.length }}</span>
          <span class="mt-1 text-xs text-on-surface-variant">Locales en el directorio</span>
        </div>
        <div class="flex flex-col justify-between rounded border border-outline-variant/60 bg-surface-container-low p-4">
          <span class="font-label text-xs font-semibold tracking-wider text-on-surface-variant uppercase">Alta cocina</span>
          <span class="font-headline text-2xl font-bold text-on-surface">
            {{ restaurants.filter((site) => site.category === 'fine-dining').length }}
          </span>
          <span class="mt-1 text-xs text-on-surface-variant">Sedes de esta categoría</span>
        </div>
        <div class="flex flex-col justify-between rounded border border-outline-variant/60 bg-surface-container-low p-4">
          <span class="font-label text-xs font-semibold tracking-wider text-on-surface-variant uppercase">Cava y bistró</span>
          <span class="font-headline text-2xl font-bold text-on-surface">
            {{ restaurants.filter((site) => site.category === 'bistro').length }}
          </span>
          <span class="mt-1 text-xs text-on-surface-variant">Sedes de esta categoría</span>
        </div>
        <div class="flex flex-col justify-between rounded border border-outline-variant/60 bg-surface-container-low p-4">
          <span class="font-label text-xs font-semibold tracking-wider text-on-surface-variant uppercase">Laboratorio</span>
          <span class="font-headline text-2xl font-bold text-on-surface">
            {{ restaurants.filter((site) => site.category === 'lab').length }}
          </span>
          <span class="mt-1 text-xs text-on-surface-variant">Sedes de I+D</span>
        </div>
      </div>
    </section>

    <div
      class="flex flex-col items-stretch justify-between gap-3 rounded-lg border border-outline-variant/60 bg-surface-container-lowest p-3 shadow-sm md:flex-row md:items-center"
    >
      <div class="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0" role="tablist" aria-label="Filtrar sedes">
        <button
          v-for="filter in categoryFilters"
          :key="filter.id"
          type="button"
          class="font-label rounded px-3.5 py-1.5 text-xs whitespace-nowrap transition-colors"
          :class="
            activeCategory === filter.id
              ? 'bg-primary font-semibold text-on-primary shadow-sm'
              : 'bg-surface-container font-medium text-on-surface-variant hover:bg-surface-container-high'
          "
          @click="activeCategory = filter.id"
        >
          {{ filter.label }}
        </button>
      </div>
      <label class="relative flex-1 md:w-80">
        <span class="sr-only">Filtrar sedes</span>
        <svg
          class="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-outline"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="1.8"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
          />
        </svg>
        <input
          v-model="searchQuery"
          class="w-full rounded border border-outline-variant/60 bg-surface-container-low py-1.5 pr-3 pl-8 text-xs text-on-surface placeholder:text-outline focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
          placeholder="Filtrar por nombre, ciudad o código..."
          type="search"
        />
      </label>
    </div>

    <p v-if="isLoading" class="text-sm text-on-surface-variant">Cargando sedes…</p>
    <p v-else-if="loadError" class="rounded-lg border border-error-container bg-error-container px-3 py-2 text-sm text-on-error-container" role="alert">
      {{ loadError }}
    </p>
    <p v-else-if="filteredRestaurants.length === 0" class="text-sm text-on-surface-variant">
      No hay sedes que coincidan con el filtro.
    </p>
    <div v-else class="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <RestaurantSiteCard
        v-for="site in filteredRestaurants"
        :key="site.id"
        :restaurant="site"
        :is-selected="session.restaurantId === site.id"
        @enter="enterSite(site)"
      />
    </div>
  </div>
</template>
