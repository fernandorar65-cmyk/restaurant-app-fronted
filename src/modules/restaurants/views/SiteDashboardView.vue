<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

import { usePageTitle } from '@/composables/usePageTitle'
import { fetchRestaurantById, fetchSiteOperation } from '@/modules/restaurants/api'
import SiteFloorTable from '@/modules/restaurants/components/SiteFloorTable.vue'
import SiteStaffCard from '@/modules/restaurants/components/SiteStaffCard.vue'
import SiteTableCard from '@/modules/restaurants/components/SiteTableCard.vue'
import { floorStatusLabel, staffAreaLabel } from '@/modules/restaurants/site-labels'
import type {
  RestaurantSite,
  SiteOperation,
  StaffArea,
  TableFloorStatus,
} from '@/modules/restaurants/types'
import { HttpError } from '@/services/http'
import { useSessionStore } from '@/stores/session'

usePageTitle('Administración de sede')

const route = useRoute()
const session = useSessionStore()

const restaurant = ref<RestaurantSite | null>(null)
const operation = ref<SiteOperation | null>(null)
const loadError = ref<string | null>(null)
const isLoading = ref(true)
const floorFilter = ref<'all' | TableFloorStatus>('all')
const staffFilter = ref<'all' | StaffArea>('all')
const selectedTableNumber = ref<string | null>(null)

const restaurantId = computed(() => {
  const value = route.params.restaurantId
  return typeof value === 'string' ? value : null
})

const tableStats = computed(() => {
  const tables = operation.value?.tables ?? []
  const occupied = tables.filter((table) => table.floorStatus === 'occupied')
  const seatsTotal = tables.reduce((sum, table) => sum + table.seats, 0)
  const seatsOccupied = tables.reduce((sum, table) => sum + table.occupiedSeats, 0)

  return {
    tablesTotal: tables.length,
    tablesOccupied: occupied.length,
    tablesAvailable: tables.filter((table) => table.floorStatus === 'available').length,
    tablesReserved: tables.filter((table) => table.floorStatus === 'reserved').length,
    seatsTotal,
    seatsOccupied,
    seatPercent: seatsTotal === 0 ? 0 : Math.round((seatsOccupied / seatsTotal) * 100),
  }
})

const staffStats = computed(() => {
  const staff = operation.value?.staff ?? []
  const onShift = staff.filter((member) => member.status === 'on-shift')

  return {
    total: staff.length,
    onShift: onShift.length,
    break: staff.filter((member) => member.status === 'break').length,
    absent: staff.filter((member) => member.status === 'absent').length,
  }
})

const visibleTables = computed(() => {
  const tables = operation.value?.tables ?? []

  if (floorFilter.value === 'all') {
    return tables
  }

  return tables.filter((table) => table.floorStatus === floorFilter.value)
})

const visibleStaff = computed(() => {
  const staff = operation.value?.staff ?? []

  if (staffFilter.value === 'all') {
    return staff
  }

  return staff.filter((member) => member.area === staffFilter.value)
})

const selectedTable = computed(() => {
  const tables = operation.value?.tables ?? []
  return tables.find((table) => table.number === selectedTableNumber.value) ?? null
})

const floorFilters: Array<{ id: 'all' | TableFloorStatus; label: string }> = [
  { id: 'all', label: 'Todas' },
  { id: 'occupied', label: floorStatusLabel.occupied },
  { id: 'available', label: floorStatusLabel.available },
  { id: 'reserved', label: floorStatusLabel.reserved },
  { id: 'cleaning', label: floorStatusLabel.cleaning },
]

const staffFilters: Array<{ id: 'all' | StaffArea; label: string }> = [
  { id: 'all', label: 'Todo el equipo' },
  { id: 'floor', label: staffAreaLabel.floor },
  { id: 'kitchen', label: staffAreaLabel.kitchen },
  { id: 'support', label: staffAreaLabel.support },
]

function selectTable(number: string): void {
  selectedTableNumber.value = number
}

async function loadSite(): Promise<void> {
  const id = restaurantId.value
  isLoading.value = true
  loadError.value = null
  restaurant.value = null
  operation.value = null
  selectedTableNumber.value = null

  if (!id) {
    loadError.value = 'No se indicó una sede.'
    isLoading.value = false
    return
  }

  session.setRestaurant(id)

  try {
    const [site, siteOperation] = await Promise.all([fetchRestaurantById(id), fetchSiteOperation(id)])
    restaurant.value = site
    operation.value = siteOperation

    if (!site) {
      loadError.value = 'La sede no existe.'
    } else if (!siteOperation) {
      loadError.value = 'No hay datos operativos para esta sede.'
    } else {
      const firstOccupied = siteOperation.tables.find((table) => table.floorStatus === 'occupied')
      selectedTableNumber.value = firstOccupied?.number ?? siteOperation.tables[0]?.number ?? null
    }
  } catch (error) {
    loadError.value = error instanceof HttpError ? error.message : 'No se pudo cargar la sede.'
  } finally {
    isLoading.value = false
  }
}

watch(
  restaurantId,
  () => {
    void loadSite()
  },
  { immediate: true },
)
</script>

<template>
  <div class="mx-auto w-full max-w-7xl space-y-8 px-6 py-8 lg:px-12">
    <p v-if="isLoading" class="text-sm text-on-surface-variant">Cargando sede…</p>
    <p
      v-else-if="loadError"
      class="rounded-lg border border-error-container bg-error-container px-3 py-2 text-sm text-on-error-container"
      role="alert"
    >
      {{ loadError }}
    </p>

    <template v-else-if="restaurant && operation">
      <div class="flex flex-col gap-5">
        <nav class="font-label flex flex-wrap items-center gap-2 text-[11px] font-semibold tracking-widest text-on-surface-variant uppercase" aria-label="Migas">
          <RouterLink class="transition-colors hover:text-primary" :to="{ name: 'dashboard' }">Sedes</RouterLink>
          <span class="text-outline-variant">/</span>
          <span class="font-bold text-primary">{{ restaurant.name }} ({{ restaurant.city }})</span>
          <span class="text-outline-variant">/</span>
          <span class="text-tertiary">Sala y equipo</span>
        </nav>

        <div class="flex flex-col justify-between gap-6 xl:flex-row xl:items-end">
          <div class="max-w-3xl space-y-2">
            <p class="font-label inline-flex items-center gap-2 rounded-full bg-surface-container px-2.5 py-1 text-[10px] font-bold tracking-widest text-tertiary uppercase">
              {{ restaurant.badgeLabel }} · {{ restaurant.code }}
            </p>
            <h1 class="font-headline text-3xl leading-[1.15] font-normal tracking-tight text-on-surface sm:text-4xl">
              Administración de sede
            </h1>
            <p class="text-sm leading-relaxed text-on-surface-variant sm:text-base">
              Estado de mesas, sillas y personal de {{ restaurant.name }}. Datos de demostración hasta conectar el API.
            </p>
          </div>
          <div class="flex items-center gap-3 rounded-xl bg-surface-container-lowest px-4 py-2.5 shadow-sm">
            <span class="relative flex h-2.5 w-2.5">
              <span class="absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span class="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
            </span>
            <div class="flex flex-col">
              <span class="font-label text-[10px] font-semibold tracking-widest text-on-surface-variant uppercase">Turno activo</span>
              <span class="font-label text-xs font-bold text-on-surface">{{ operation.shiftLabel }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article class="rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
          <span class="font-label text-[11px] font-semibold tracking-wider text-on-surface-variant uppercase">Mesas</span>
          <p class="font-headline pt-1 text-3xl font-semibold tracking-tight text-on-surface">
            {{ tableStats.tablesOccupied }}
            <span class="text-xl font-normal text-on-surface-variant">/ {{ tableStats.tablesTotal }}</span>
          </p>
          <p class="mt-2 text-xs text-on-surface-variant">
            {{ tableStats.tablesAvailable }} libres · {{ tableStats.tablesReserved }} reservadas
          </p>
        </article>
        <article class="rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
          <span class="font-label text-[11px] font-semibold tracking-wider text-on-surface-variant uppercase">Sillas</span>
          <p class="font-headline pt-1 text-3xl font-semibold tracking-tight text-on-surface">
            {{ tableStats.seatsOccupied }}
            <span class="text-xl font-normal text-on-surface-variant">/ {{ tableStats.seatsTotal }}</span>
          </p>
          <div class="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high">
            <div class="h-full rounded-full bg-primary" :style="{ width: `${tableStats.seatPercent}%` }" />
          </div>
          <p class="mt-2 text-xs text-on-surface-variant">{{ tableStats.seatPercent }}% de cubiertos ocupados</p>
        </article>
        <article class="rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
          <span class="font-label text-[11px] font-semibold tracking-wider text-on-surface-variant uppercase">Personal</span>
          <p class="font-headline pt-1 text-3xl font-semibold tracking-tight text-on-surface">
            {{ staffStats.onShift }}
            <span class="text-xl font-normal text-on-surface-variant">/ {{ staffStats.total }}</span>
          </p>
          <p class="mt-2 text-xs text-on-surface-variant">
            {{ staffStats.break }} en descanso · {{ staffStats.absent }} ausentes
          </p>
        </article>
        <article class="rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
          <span class="font-label text-[11px] font-semibold tracking-wider text-on-surface-variant uppercase">Servicio</span>
          <p class="font-headline pt-1 text-3xl font-semibold tracking-tight text-on-surface">
            {{ operation.kpis.cadence }}
            <span class="text-xl font-normal text-on-surface-variant">min</span>
          </p>
          <p class="mt-2 text-xs text-on-surface-variant">{{ operation.kpis.cadenceDetail }}</p>
        </article>
      </div>

      <div class="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <section class="rounded-2xl bg-surface-container-lowest p-5 shadow-sm sm:p-6 lg:col-span-8">
          <div class="flex flex-col justify-between gap-4 pb-5 sm:flex-row sm:items-center">
            <div>
              <h2 class="font-headline text-xl font-normal text-on-surface">Plano de sala</h2>
              <p class="mt-1 text-xs text-on-surface-variant">Cada punto es una silla. El color de la mesa indica el estado.</p>
            </div>
            <div class="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar mesas">
              <button
                v-for="filter in floorFilters"
                :key="filter.id"
                type="button"
                class="font-label rounded-lg px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase"
                :class="
                  floorFilter === filter.id
                    ? 'bg-primary-container text-on-primary-container'
                    : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                "
                @click="floorFilter = filter.id"
              >
                {{ filter.label }}
              </button>
            </div>
          </div>

          <div class="grid grid-cols-3 gap-2 sm:grid-cols-4 xl:grid-cols-6">
            <SiteFloorTable
              v-for="table in visibleTables"
              :key="table.number"
              :table="table"
              :selected="table.number === selectedTableNumber"
              @select="selectTable(table.number)"
            />
          </div>
          <p v-if="visibleTables.length === 0" class="pt-4 text-sm text-on-surface-variant">No hay mesas en este estado.</p>

          <div v-if="selectedTable" class="mt-6 border-t border-outline-variant/50 pt-5">
            <h3 class="font-label mb-3 text-[11px] font-semibold tracking-widest text-on-surface-variant uppercase">
              Mesa seleccionada
            </h3>
            <SiteTableCard :table="selectedTable" highlight />
          </div>
        </section>

        <section class="space-y-4 rounded-2xl bg-surface-container-lowest p-5 shadow-sm sm:p-6 lg:col-span-4">
          <div>
            <div class="flex items-center justify-between gap-3">
              <h2 class="font-headline text-lg font-normal text-on-surface">Personal del turno</h2>
              <span class="font-label rounded-full bg-surface-container px-2.5 py-1 text-[11px] font-bold text-primary">
                {{ staffStats.onShift }} en sala/cocina
              </span>
            </div>
            <p class="mt-1 text-xs text-on-surface-variant">{{ operation.brigade.headChef }} dirige el servicio.</p>
          </div>
          <div class="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar personal">
            <button
              v-for="filter in staffFilters"
              :key="filter.id"
              type="button"
              class="font-label rounded-lg px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase"
              :class="
                staffFilter === filter.id
                  ? 'bg-primary-container text-on-primary-container'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
              "
              @click="staffFilter = filter.id"
            >
              {{ filter.label }}
            </button>
          </div>
          <div class="space-y-2">
            <SiteStaffCard v-for="member in visibleStaff" :key="member.id" :member="member" />
          </div>
          <p v-if="visibleStaff.length === 0" class="text-sm text-on-surface-variant">No hay personal en esta área.</p>
        </section>
      </div>

      <section class="rounded-2xl bg-surface-container-lowest p-5 shadow-sm sm:p-6">
        <h2 class="font-headline text-lg font-normal text-on-surface">Avisos de sala</h2>
        <div class="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <article v-for="alert in operation.alerts" :key="alert.title" class="space-y-2 rounded-xl bg-surface-container-low p-4">
            <div class="flex items-center justify-between gap-2">
              <span class="font-label text-xs font-bold text-on-surface">{{ alert.title }}</span>
              <span class="font-label text-[10px] font-bold tracking-widest text-tertiary uppercase">{{ alert.status }}</span>
            </div>
            <p class="text-xs leading-relaxed text-on-surface-variant">{{ alert.description }}</p>
          </article>
        </div>
      </section>
    </template>
  </div>
</template>
