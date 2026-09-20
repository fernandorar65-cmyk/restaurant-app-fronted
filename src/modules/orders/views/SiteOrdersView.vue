<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import { usePageTitle } from '@/composables/usePageTitle'
import { fetchKitchenTickets } from '@/modules/orders/api'
import KitchenTicketCard from '@/modules/orders/components/KitchenTicketCard.vue'
import KitchenTicketDialog from '@/modules/orders/components/KitchenTicketDialog.vue'
import {
  boardColumns,
  columnCountClass,
  columnDotClass,
  columnHint,
  columnHintClass,
  columnShellClass,
  columnWipLimit,
  ticketStatusLabel,
} from '@/modules/orders/ticket-labels'
import type { KitchenTicket } from '@/modules/orders/types'
import { fetchRestaurantById } from '@/modules/restaurants/api'
import type { RestaurantSite } from '@/modules/restaurants/types'
import { HttpError } from '@/services/http'
import { useSessionStore } from '@/stores/session'

usePageTitle('Pedidos de sede')

const route = useRoute()
const router = useRouter()
const session = useSessionStore()

const restaurant = ref<RestaurantSite | null>(null)
const tickets = ref<KitchenTicket[]>([])
const loadError = ref<string | null>(null)
const isLoading = ref(true)
const searchQuery = ref('')
const urgentOnly = ref(false)

const restaurantId = computed(() => {
  const value = route.params.restaurantId
  return typeof value === 'string' ? value : null
})

const selectedOrderId = computed(() => {
  const value = route.params.orderId
  return typeof value === 'string' ? value : null
})

const filteredTickets = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()

  return tickets.value.filter((ticket) => {
    if (urgentOnly.value && ticket.priority !== 'urgent' && ticket.allergen === null) {
      return false
    }

    if (!query) {
      return true
    }

    return (
      ticket.code.toLowerCase().includes(query) ||
      ticket.tableNumber.toLowerCase().includes(query) ||
      ticket.title.toLowerCase().includes(query) ||
      ticket.station.toLowerCase().includes(query)
    )
  })
})

const ticketsByStatus = computed(() => {
  return boardColumns.map((status) => ({
    status,
    label: ticketStatusLabel[status],
    items: filteredTickets.value.filter((ticket) => ticket.status === status),
  }))
})

const boardStats = computed(() => {
  const all = tickets.value
  const inProgress = all.filter((ticket) => ticket.status === 'cooking' || ticket.status === 'plating' || ticket.status === 'pass')
  const blocked = all.filter((ticket) => ticket.allergen !== null)
  const served = all.filter((ticket) => ticket.status === 'served')

  return {
    wip: inProgress.length,
    blocked: blocked.length,
    blockedTable: blocked[0]?.tableNumber ?? null,
    served: served.length,
    total: all.length,
  }
})

const selectedTicket = computed(() => {
  const id = selectedOrderId.value
  if (!id) {
    return null
  }

  return tickets.value.find((ticket) => ticket.id === id) ?? null
})

async function selectTicket(ticket: KitchenTicket): Promise<void> {
  const id = restaurantId.value
  if (!id) {
    return
  }

  await router.push({
    name: 'site-order-detail',
    params: { restaurantId: id, orderId: ticket.id },
  })
}

async function closeTicketForm(): Promise<void> {
  const id = restaurantId.value
  if (!id) {
    return
  }

  await router.push({
    name: 'site-orders',
    params: { restaurantId: id },
  })
}

async function loadBoard(): Promise<void> {
  const id = restaurantId.value
  isLoading.value = true
  loadError.value = null
  restaurant.value = null
  tickets.value = []

  if (!id) {
    loadError.value = 'No se indicó una sede.'
    isLoading.value = false
    return
  }

  session.setRestaurant(id)

  try {
    const [site, kitchenTickets] = await Promise.all([fetchRestaurantById(id), fetchKitchenTickets(id)])
    restaurant.value = site
    tickets.value = kitchenTickets

    if (!site) {
      loadError.value = 'La sede no existe.'
    }
  } catch (error) {
    loadError.value = error instanceof HttpError ? error.message : 'No se pudieron cargar los pedidos.'
  } finally {
    isLoading.value = false
  }
}

watch(
  restaurantId,
  () => {
    void loadBoard()
  },
  { immediate: true },
)
</script>

<template>
  <div class="mx-auto w-full space-y-5 px-3 py-6 lg:px-4">
    <p v-if="isLoading" class="text-sm text-on-surface-variant">Cargando pedidos…</p>
    <p
      v-else-if="loadError"
      class="rounded-lg border border-error-container bg-error-container px-3 py-2 text-sm text-on-error-container"
      role="alert"
    >
      {{ loadError }}
    </p>

    <template v-else-if="restaurant">
      <div class="space-y-4">
        <nav class="font-label flex flex-wrap items-center gap-2 text-[11px] font-semibold tracking-widest text-on-surface-variant uppercase" aria-label="Migas">
          <RouterLink class="transition-colors hover:text-primary" :to="{ name: 'dashboard' }">Sedes</RouterLink>
          <span class="text-outline-variant">/</span>
          <RouterLink class="transition-colors hover:text-primary" :to="{ name: 'site-dashboard', params: { restaurantId: restaurant.id } }">
            {{ restaurant.name }} ({{ restaurant.city }})
          </RouterLink>
          <span class="text-outline-variant">/</span>
          <span class="font-bold text-primary">Pedidos</span>
        </nav>

        <div class="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <h1 class="font-headline text-2xl font-semibold tracking-tight text-on-surface lg:text-3xl">
              Pedidos entrantes — tablero de cocina
            </h1>
            <p class="mt-1 text-sm text-on-surface-variant">
              Flujo de comandas de {{ restaurant.name }} por mesa, pase y partida.
            </p>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4 md:grid-cols-4">
        <article class="flex items-center justify-between rounded-xl bg-surface p-3">
          <div>
            <span class="font-label text-[11px] tracking-wider text-on-surface-variant uppercase">WIP total en marcha</span>
            <div class="mt-0.5 flex items-baseline gap-2">
              <p class="font-headline text-2xl font-semibold text-on-surface">{{ boardStats.wip }}</p>
              <p class="font-label text-[11px] text-secondary">/ {{ boardStats.total }} comandas</p>
            </div>
          </div>
          <div class="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary" aria-hidden="true">
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
        </article>
        <article class="flex items-center justify-between rounded-xl bg-surface p-3">
          <div>
            <span class="font-label text-[11px] tracking-wider text-on-surface-variant uppercase">Ocupación de sala</span>
            <div class="mt-0.5 flex items-baseline gap-2">
              <p class="font-headline text-2xl font-semibold text-on-surface">{{ restaurant.kpis.occupancyPercent }}%</p>
              <p class="font-label text-[11px] font-medium text-emerald-700">{{ restaurant.kpis.occupancyHint }}</p>
            </div>
          </div>
          <div class="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-800" aria-hidden="true">
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6l3 1.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
        </article>
        <article class="flex items-center justify-between rounded-xl bg-surface p-3">
          <div>
            <span class="font-label text-[11px] tracking-wider text-on-surface-variant uppercase">Bloqueos & alérgenos</span>
            <div class="mt-0.5 flex items-baseline gap-2">
              <p class="font-headline text-2xl font-semibold" :class="boardStats.blocked > 0 ? 'text-error' : 'text-on-surface'">
                {{ boardStats.blocked }}
              </p>
              <p class="font-label text-[11px] font-medium" :class="boardStats.blocked > 0 ? 'text-error' : 'text-secondary'">
                {{ boardStats.blockedTable ? `Mesa ${boardStats.blockedTable} (protocolo activo)` : 'Sin protocolos' }}
              </p>
            </div>
          </div>
          <div class="flex h-9 w-9 items-center justify-center rounded-full bg-error-container text-on-error-container" aria-hidden="true">
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
              />
            </svg>
          </div>
        </article>
        <article class="flex items-center justify-between rounded-xl bg-surface p-3">
          <div>
            <span class="font-label text-[11px] tracking-wider text-on-surface-variant uppercase">Throughput del turno</span>
            <div class="mt-0.5 flex items-baseline gap-2">
              <p class="font-headline text-2xl font-semibold text-on-surface">{{ boardStats.served }}</p>
              <p class="font-label text-[11px] font-medium text-primary">Pases cerrados en tablero</p>
            </div>
          </div>
          <div class="flex h-9 w-9 items-center justify-center rounded-full bg-tertiary-fixed text-on-tertiary-container" aria-hidden="true">
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          </div>
        </article>
      </div>

      <div class="flex flex-col gap-3 rounded-xl bg-surface-container-lowest p-3 shadow-sm lg:flex-row lg:items-center">
        <label class="sr-only" for="ticket-search">Filtrar comandas</label>
        <input
          id="ticket-search"
          v-model="searchQuery"
          class="w-full rounded-lg bg-surface px-3 py-2 text-sm text-on-surface shadow-inner outline-none ring-1 ring-transparent placeholder:text-on-surface-variant/60 focus:ring-primary lg:max-w-sm"
          placeholder="Filtrar por mesa, comanda o plato..."
          type="search"
        />
        <button
          type="button"
          class="font-label rounded-full px-3 py-1.5 text-[11px] font-semibold"
          :class="urgentOnly ? 'bg-error-container text-on-error-container' : 'bg-surface-container text-on-surface-variant'"
          @click="urgentOnly = !urgentOnly"
        >
          Urgente / alérgenos
        </button>
      </div>

      <div class="grid w-full grid-cols-5 items-start gap-2 xl:gap-3">
        <section
          v-for="column in ticketsByStatus"
          :key="column.status"
          class="flex min-h-0 min-w-0 flex-col rounded-2xl p-2 xl:p-3"
          :class="columnShellClass[column.status]"
        >
          <div class="flex flex-col gap-1 px-0.5 pb-2">
            <div class="flex items-start justify-between gap-1">
              <h2
                class="font-headline flex min-w-0 items-center gap-1.5 text-[11px] font-semibold tracking-wide uppercase xl:text-sm"
                :class="column.status === 'served' ? 'text-on-surface-variant' : 'text-on-surface'"
              >
                <span class="h-2 w-2 shrink-0 rounded-full xl:h-2.5 xl:w-2.5" :class="columnDotClass[column.status]" aria-hidden="true" />
                <span class="leading-tight">{{ column.label }}</span>
              </h2>
              <span
                class="shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold xl:text-[11px]"
                :class="columnCountClass[column.status]"
              >
                {{ column.items.length }}
              </span>
            </div>
            <span
              class="font-label truncate text-[9px] font-medium tracking-wider uppercase xl:text-[10px]"
              :class="columnHintClass[column.status]"
            >
              <template v-if="columnWipLimit[column.status]">
                WIP {{ column.items.length }}/{{ columnWipLimit[column.status] }} · {{ columnHint[column.status] }}
              </template>
              <template v-else>{{ columnHint[column.status] }}</template>
            </span>
          </div>
          <div class="flex min-w-0 flex-col" :class="column.status === 'served' ? 'gap-2' : 'gap-2.5'">
            <KitchenTicketCard
              v-for="ticket in column.items"
              :key="ticket.id"
              :ticket="ticket"
              :selected="selectedTicket?.id === ticket.id"
              @select="selectTicket(ticket)"
            />
            <p v-if="column.items.length === 0" class="px-1 text-xs text-on-surface-variant">Sin comandas.</p>
          </div>
        </section>
      </div>

      <KitchenTicketDialog
        v-if="selectedTicket"
        :key="selectedTicket.id"
        :ticket="selectedTicket"
        @close="closeTicketForm"
      />
    </template>
  </div>
</template>
