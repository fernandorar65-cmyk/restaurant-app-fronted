<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import SitePortalNav from '@/components/navigation/SitePortalNav.vue'
import { usePageTitle } from '@/composables/usePageTitle'
import { fetchKitchenTickets } from '@/modules/orders/api'
import KitchenTicketCard from '@/modules/orders/components/KitchenTicketCard.vue'
import KitchenTicketDialog from '@/modules/orders/components/KitchenTicketDialog.vue'
import { boardColumns, ticketStatusLabel } from '@/modules/orders/ticket-labels'
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
  <div class="mx-auto w-full max-w-[1600px] space-y-6 px-6 py-8 lg:px-10">
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

        <SitePortalNav :restaurant-id="restaurant.id" />

        <div class="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <h1 class="font-headline text-2xl font-semibold tracking-tight text-on-surface lg:text-3xl">Pedidos entrantes</h1>
            <p class="mt-1 text-sm text-on-surface-variant">
              Tablero de comandas de {{ restaurant.name }}. Datos de demostración hasta conectar el API.
            </p>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3 md:grid-cols-4">
        <article class="rounded-xl bg-surface-container-lowest p-4 shadow-sm">
          <span class="font-label text-[11px] font-semibold tracking-wider text-on-surface-variant uppercase">En marcha</span>
          <p class="font-headline mt-1 text-2xl font-semibold text-on-surface">{{ boardStats.wip }}</p>
          <p class="mt-1 text-[11px] text-secondary">{{ boardStats.total }} comandas en el turno</p>
        </article>
        <article class="rounded-xl bg-surface-container-lowest p-4 shadow-sm">
          <span class="font-label text-[11px] font-semibold tracking-wider text-on-surface-variant uppercase">Alérgenos</span>
          <p class="font-headline mt-1 text-2xl font-semibold" :class="boardStats.blocked > 0 ? 'text-error' : 'text-on-surface'">
            {{ boardStats.blocked }}
          </p>
          <p class="mt-1 text-[11px] text-secondary">Protocolos activos</p>
        </article>
        <article class="rounded-xl bg-surface-container-lowest p-4 shadow-sm">
          <span class="font-label text-[11px] font-semibold tracking-wider text-on-surface-variant uppercase">Servidos</span>
          <p class="font-headline mt-1 text-2xl font-semibold text-on-surface">{{ boardStats.served }}</p>
          <p class="mt-1 text-[11px] text-secondary">Cierre en tablero</p>
        </article>
        <article class="rounded-xl bg-surface-container-lowest p-4 shadow-sm">
          <span class="font-label text-[11px] font-semibold tracking-wider text-on-surface-variant uppercase">Sede</span>
          <p class="mt-1 text-sm font-semibold text-on-surface">{{ restaurant.code }}</p>
          <p class="mt-1 text-[11px] text-secondary">{{ restaurant.cuisine }}</p>
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

      <div class="overflow-x-auto">
        <div class="flex min-w-[980px] items-start gap-4 pb-2">
          <section
            v-for="column in ticketsByStatus"
            :key="column.status"
            class="flex min-w-[220px] flex-1 flex-col rounded-2xl bg-surface-container-low p-3"
          >
            <div class="mb-3 flex items-center justify-between px-1">
              <h2 class="font-headline text-sm font-semibold tracking-wide text-on-surface uppercase">{{ column.label }}</h2>
              <span class="rounded bg-surface-container px-2 py-0.5 font-mono text-[11px] font-semibold text-on-surface-variant">
                {{ column.items.length }}
              </span>
            </div>
            <div class="flex flex-col gap-3">
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
