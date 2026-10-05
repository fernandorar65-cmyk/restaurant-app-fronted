<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

import { usePageTitle } from '@/composables/usePageTitle'
import { fetchAttentionsWithProductsBySite, isAttentionActive } from '@/modules/orders/api'
import StaffOrderDialog from '@/modules/orders/components/StaffOrderDialog.vue'
import {
  isBillableProduct,
  orderedProductBadgeClass,
  orderedProductStatusLabel,
} from '@/modules/orders/order-status-labels'
import type { AttentionWithProducts } from '@/modules/orders/types'
import { fetchRestaurantById, fetchSiteOperation, updateSiteOperationTables } from '@/modules/restaurants/api'
import SiteFloorTable from '@/modules/restaurants/components/SiteFloorTable.vue'
import SiteStaffCard from '@/modules/restaurants/components/SiteStaffCard.vue'
import SiteTableCard from '@/modules/restaurants/components/SiteTableCard.vue'
import TableFormDialog from '@/modules/restaurants/components/TableFormDialog.vue'
import { floorStatusLabel, staffAreaLabel, tableStatusLabel } from '@/modules/restaurants/site-labels'
import type {
  LiveTable,
  RestaurantSite,
  SiteOperation,
  StaffArea,
  TableFloorStatus,
} from '@/modules/restaurants/types'
import { HttpError } from '@/services/http'
import { useSessionStore } from '@/stores/session'
import { useSiteActivityStore } from '@/stores/site-activity'
import { formatMoney } from '@/utils/money'
import { formatTime } from '@/utils/time'

usePageTitle('Sala y mesas')

const route = useRoute()
const session = useSessionStore()
const activity = useSiteActivityStore()

const restaurant = ref<RestaurantSite | null>(null)
const operation = ref<SiteOperation | null>(null)
const loadError = ref<string | null>(null)
const isLoading = ref(true)
const floorFilter = ref<'all' | TableFloorStatus>('all')
const staffFilter = ref<'all' | StaffArea>('all')
const selectedTableNumber = ref<string | null>(null)
/** undefined = diálogo cerrado · null = nueva mesa · LiveTable = editar. */
const editingTable = ref<LiveTable | null | undefined>(undefined)
const staffOrderTable = ref<string | null>(null)
const tableActionError = ref<string | null>(null)
const attentions = ref<AttentionWithProducts[]>([])

const currency = computed(() => restaurant.value?.currency ?? 'EUR')

const activeAttentionByTable = computed(() => {
  const byTable = new Map<string, AttentionWithProducts>()

  for (const attention of attentions.value.filter(isAttentionActive)) {
    byTable.set(attention.tableNumber, attention)
  }

  return byTable
})

/**
 * Mesas con el estado de sala calculado a partir de las atenciones reales:
 * ocupada si tiene una atención activa; si no, se respeta reservada/limpieza.
 */
const liveTables = computed<LiveTable[]>(() =>
  (operation.value?.tables ?? []).map((table) => {
    const attention = activeAttentionByTable.value.get(table.number)

    if (attention) {
      return {
        ...table,
        floorStatus: 'occupied',
        occupiedSeats: table.occupiedSeats > 0 ? table.occupiedSeats : Math.min(2, table.seats),
      }
    }

    return table.floorStatus === 'occupied' ? { ...table, floorStatus: 'available', occupiedSeats: 0 } : table
  }),
)

const restaurantId = computed(() => {
  const value = route.params.restaurantId
  return typeof value === 'string' ? value : null
})

const tableStats = computed(() => {
  const tables = liveTables.value
  const occupied = tables.filter((table) => table.floorStatus === 'occupied')
  const seatsTotal = tables.reduce((sum, table) => sum + table.seats, 0)
  const seatsOccupied = tables.reduce((sum, table) => sum + table.occupiedSeats, 0)

  return {
    tablesTotal: tables.length,
    tablesOccupied: occupied.length,
    tablesAvailable: tables.filter((table) => table.floorStatus === 'available').length,
    tablesReserved: tables.filter((table) => table.floorStatus === 'reserved').length,
    tablesBlocked: tables.filter((table) => table.status !== 'active').length,
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

const serviceStats = computed(() => {
  const active = attentions.value.filter(isAttentionActive)
  const products = active.flatMap((attention) => attention.products)

  return {
    open: active.length,
    accountRequested: active.filter((attention) => attention.status === 'account-requested').length,
    inKitchen: products.filter((product) => product.status === 'confirmed' || product.status === 'preparing').length,
    openTotal: products.filter((product) => isBillableProduct(product.status)).reduce((sum, p) => sum + p.subtotal, 0),
  }
})

const visibleTables = computed(() => {
  const tables = liveTables.value

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
  return liveTables.value.find((table) => table.number === selectedTableNumber.value) ?? null
})

const selectedAttention = computed(() =>
  selectedTable.value ? (activeAttentionByTable.value.get(selectedTable.value.number) ?? null) : null,
)

const selectedAttentionTotal = computed(() =>
  (selectedAttention.value?.products ?? [])
    .filter((product) => isBillableProduct(product.status))
    .reduce((sum, product) => sum + product.subtotal, 0),
)

const selectedTableUrl = computed(() => {
  if (!selectedTable.value || !restaurantId.value) {
    return null
  }

  return tableUrl(selectedTable.value)
})

const qrCodeUrl = computed(() => {
  if (!selectedTableUrl.value) {
    return null
  }

  return qrImageUrl(selectedTableUrl.value)
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

function tableUrl(table: LiveTable): string {
  return `${window.location.origin}/table/${encodeURIComponent(table.number)}?restaurant=${restaurantId.value}&token=${table.qrToken}`
}

function qrImageUrl(url: string, size = 160): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}`
}

/** Abre una hoja imprimible con el QR de cada mesa activa de la sede. */
function printAllQrs(): void {
  const site = restaurant.value
  const tables = liveTables.value.filter((table) => table.status === 'active' && table.qrActive)

  if (!site || tables.length === 0) {
    tableActionError.value = 'No hay mesas activas con QR habilitado para imprimir.'
    return
  }

  const escape = (value: string) =>
    value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char)
  const cards = tables
    .map(
      (table) => `<figure><img src="${qrImageUrl(tableUrl(table), 260)}" alt=""><figcaption><strong>Mesa ${escape(table.number)}</strong><span>${escape(site.name)}</span><small>Escanea para ver la carta y pedir</small></figcaption></figure>`,
    )
    .join('')
  const page = window.open('', '_blank')

  if (!page) {
    tableActionError.value = 'El navegador bloqueó la ventana de impresión.'
    return
  }

  page.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>QR de mesas · ${escape(site.name)}</title>
<style>body{font-family:system-ui,sans-serif;margin:24px}main{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
figure{margin:0;border:1px dashed #999;border-radius:12px;padding:16px;text-align:center;break-inside:avoid}
img{width:180px;height:180px}figcaption{display:flex;flex-direction:column;gap:4px;margin-top:8px}
strong{font-size:22px}small{color:#666}@media print{button{display:none}}</style></head>
<body><button onclick="print()">Imprimir</button><main>${cards}</main></body></html>`)
  page.document.close()
}

async function copyTableLink(): Promise<void> {
  if (!selectedTableUrl.value) {
    return
  }

  try {
    await navigator.clipboard.writeText(selectedTableUrl.value)
  } catch {
    tableActionError.value = 'No se pudo copiar el enlace.'
  }
}

async function saveTable(table: LiveTable): Promise<void> {
  const currentOperation = operation.value
  const original = editingTable.value
  if (!currentOperation) {
    return
  }

  tableActionError.value = null

  if (original && original.number !== table.number && activeAttentionByTable.value.has(original.number)) {
    tableActionError.value = `No se puede renumerar la mesa ${original.number}: tiene una atención abierta.`
    editingTable.value = undefined
    return
  }

  const tables = original
    ? currentOperation.tables.map((item) => (item.number === original.number ? table : item))
    : [...currentOperation.tables, table]

  try {
    const updated = await updateSiteOperationTables(currentOperation.id, tables)
    operation.value = updated
    selectedTableNumber.value = table.number
    editingTable.value = undefined
  } catch {
    tableActionError.value = original ? 'No se pudo guardar la mesa.' : 'No se pudo crear la mesa.'
  }
}

async function toggleTableQr(): Promise<void> {
  const currentOperation = operation.value
  const table = selectedTable.value

  if (!currentOperation || !table) {
    return
  }

  tableActionError.value = null

  try {
    const updated = await updateSiteOperationTables(
      currentOperation.id,
      currentOperation.tables.map((item) =>
        item.number === table.number ? { ...item, qrActive: !item.qrActive } : item,
      ),
    )
    operation.value = updated
  } catch {
    tableActionError.value = 'No se pudo actualizar el QR.'
  }
}

async function regenerateTableQr(): Promise<void> {
  const currentOperation = operation.value
  const table = selectedTable.value

  if (!currentOperation || !table) {
    return
  }

  tableActionError.value = null
  const newToken = crypto.randomUUID().replace(/-/g, '').slice(0, 16)

  try {
    const updated = await updateSiteOperationTables(
      currentOperation.id,
      currentOperation.tables.map((item) => (item.number === table.number ? { ...item, qrToken: newToken } : item)),
    )
    operation.value = updated
  } catch {
    tableActionError.value = 'No se pudo regenerar el QR.'
  }
}

async function removeSelectedTable(): Promise<void> {
  const currentOperation = operation.value
  const table = selectedTable.value

  if (!currentOperation || !table) {
    return
  }

  if (activeAttentionByTable.value.has(table.number)) {
    tableActionError.value = `La mesa ${table.number} tiene una atención abierta: ciérrala antes de eliminarla.`
    return
  }

  if (!window.confirm(`¿Eliminar la mesa ${table.number}?`)) {
    return
  }

  tableActionError.value = null

  try {
    const updated = await updateSiteOperationTables(
      currentOperation.id,
      currentOperation.tables.filter((item) => item.number !== table.number),
    )
    operation.value = updated
    selectedTableNumber.value = updated.tables[0]?.number ?? null
  } catch {
    tableActionError.value = 'No se pudo eliminar la mesa.'
  }
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
    const [site, siteOperation, siteAttentions] = await Promise.all([
      fetchRestaurantById(id),
      fetchSiteOperation(id),
      fetchAttentionsWithProductsBySite(id),
    ])
    restaurant.value = site
    operation.value = siteOperation
    attentions.value = siteAttentions

    if (!site) {
      loadError.value = 'La sede no existe.'
    } else if (!siteOperation) {
      loadError.value = 'No hay datos operativos para esta sede.'
    } else {
      const firstOccupied = liveTables.value.find((table) => table.floorStatus === 'occupied')
      selectedTableNumber.value = firstOccupied?.number ?? siteOperation.tables[0]?.number ?? null
    }
  } catch (error) {
    loadError.value = error instanceof HttpError ? error.message : 'No se pudo cargar la sede.'
  } finally {
    isLoading.value = false
  }
}

async function refreshAttentions(): Promise<void> {
  const id = restaurantId.value

  if (id) {
    try {
      attentions.value = await fetchAttentionsWithProductsBySite(id)
    } catch {
      // Se reintenta en el próximo ciclo de actividad.
    }
  }
}

watch(
  restaurantId,
  () => {
    void loadSite()
  },
  { immediate: true },
)

watch(
  () => activity.revision,
  () => void refreshAttentions(),
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
              Sala y mesas
            </h1>
            <p class="text-sm leading-relaxed text-on-surface-variant sm:text-base">
              Mesas, QR y atenciones abiertas de {{ restaurant.name }}. La ocupación se calcula con los pedidos reales.
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <RouterLink
              v-if="session.can('orders.manage')"
              class="font-label rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary-container"
              :to="{ name: 'site-orders', params: { restaurantId: restaurant.id } }"
            >
              Ver pedidos
            </RouterLink>
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
            <template v-if="tableStats.tablesBlocked > 0"> · {{ tableStats.tablesBlocked }} fuera de servicio</template>
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
          <span class="font-label text-[11px] font-semibold tracking-wider text-on-surface-variant uppercase">Atenciones abiertas</span>
          <p class="font-headline pt-1 text-3xl font-semibold tracking-tight text-on-surface">
            {{ serviceStats.open }}
          </p>
          <p class="mt-2 text-xs text-on-surface-variant">
            {{ serviceStats.inKitchen }} en cocina · {{ serviceStats.accountRequested }} piden cuenta ·
            {{ formatMoney(serviceStats.openTotal, currency) }} abierto
          </p>
        </article>
      </div>

      <div class="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <section class="rounded-2xl bg-surface-container-lowest p-5 shadow-sm sm:p-6 lg:col-span-8">
          <div class="flex flex-col justify-between gap-4 pb-5 sm:flex-row sm:items-center">
            <div>
              <h2 class="font-headline text-xl font-normal text-on-surface">Plano de sala</h2>
              <p class="mt-1 text-xs text-on-surface-variant">Cada punto es una silla. El color de la mesa indica el estado.</p>
            </div>
            <div class="flex flex-wrap items-center gap-1.5">
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
              <button
                type="button"
                class="font-label rounded-lg bg-surface-container px-2.5 py-1 text-[11px] font-semibold text-on-surface hover:bg-surface-container-high"
                @click="printAllQrs"
              >
                Imprimir QR
              </button>
              <button
                type="button"
                class="font-label rounded-lg bg-primary px-2.5 py-1 text-[11px] font-semibold text-on-primary hover:bg-primary-container"
                @click="editingTable = null"
              >
                + Mesa
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
            <div class="mb-3 flex items-center justify-between gap-3">
              <h3 class="font-label flex items-center gap-2 text-[11px] font-semibold tracking-widest text-on-surface-variant uppercase">
                Mesa seleccionada · {{ selectedTable.code }}
                <span
                  class="rounded px-1.5 py-0.5 text-[10px] normal-case tracking-normal"
                  :class="selectedTable.status === 'active' ? 'bg-primary/10 text-primary' : 'bg-error-container text-on-error-container'"
                >
                  {{ tableStatusLabel[selectedTable.status] }}
                </span>
              </h3>
              <div class="flex gap-1.5">
                <button
                  type="button"
                  class="font-label rounded-lg bg-surface-container px-2.5 py-1 text-[11px] font-semibold text-on-surface hover:bg-surface-container-high"
                  @click="editingTable = selectedTable"
                >
                  Editar
                </button>
                <button
                  type="button"
                  class="font-label rounded-lg bg-error-container px-2.5 py-1 text-[11px] font-semibold text-on-error-container hover:bg-error/20"
                  @click="removeSelectedTable"
                >
                  Eliminar
                </button>
              </div>
            </div>
            <SiteTableCard :table="selectedTable" highlight />

            <div class="mt-4 space-y-3 rounded-xl bg-surface p-4">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <p class="font-label text-[11px] font-semibold tracking-wider text-on-surface-variant uppercase">Atención activa</p>
                <div v-if="session.can('orders.manage') && selectedTable.status === 'active'" class="flex gap-1.5">
                  <RouterLink
                    v-if="selectedAttention"
                    class="font-label rounded-lg bg-surface-container px-2.5 py-1 text-[11px] font-semibold text-on-surface hover:bg-surface-container-high"
                    :to="{ name: 'site-order-detail', params: { restaurantId: restaurant.id, attentionId: selectedAttention.id } }"
                  >
                    Ver detalle
                  </RouterLink>
                  <button
                    type="button"
                    class="font-label rounded-lg bg-primary px-2.5 py-1 text-[11px] font-semibold text-on-primary hover:bg-primary-container"
                    @click="staffOrderTable = selectedTable.number"
                  >
                    + Pedido manual
                  </button>
                </div>
              </div>
              <template v-if="selectedAttention">
                <p class="text-xs text-on-surface-variant">
                  Abierta a las {{ formatTime(selectedAttention.openedAt, restaurant.timezone) }} ·
                  {{ formatMoney(selectedAttentionTotal, currency) }}
                </p>
                <ul class="space-y-1">
                  <li
                    v-for="product in selectedAttention.products"
                    :key="product.id"
                    class="flex items-center justify-between gap-2 text-xs"
                  >
                    <span class="text-on-surface">{{ product.quantity }}× {{ product.name }}</span>
                    <span class="font-label rounded px-1.5 py-0.5 text-[10px] font-bold uppercase" :class="orderedProductBadgeClass[product.status]">
                      {{ orderedProductStatusLabel[product.status] }}
                    </span>
                  </li>
                </ul>
              </template>
              <p v-else class="text-xs text-on-surface-variant">Sin atención abierta.</p>
            </div>

            <div class="mt-4 flex flex-col gap-3 rounded-xl bg-surface p-4 sm:flex-row sm:items-center">
              <img
                v-if="qrCodeUrl"
                :alt="`QR de la mesa ${selectedTable.number}`"
                class="h-24 w-24 shrink-0 rounded-lg bg-white p-1"
                :src="qrCodeUrl"
              />
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <p class="font-label text-[11px] font-semibold tracking-wider text-on-surface-variant uppercase">
                    Enlace de la mesa (QR de acceso al menú)
                  </p>
                  <span
                    class="font-label rounded px-1.5 py-0.5 text-[10px] font-bold uppercase"
                    :class="selectedTable.qrActive ? 'bg-primary/10 text-primary' : 'bg-error-container text-on-error-container'"
                  >
                    {{ selectedTable.qrActive ? 'QR activo' : 'QR desactivado' }}
                  </span>
                </div>
                <p class="mt-1 truncate text-xs text-on-surface-variant">{{ selectedTableUrl }}</p>
                <div class="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    class="font-label rounded-lg bg-surface-container px-3 py-1.5 text-[11px] font-semibold text-on-surface hover:bg-surface-container-high"
                    @click="copyTableLink"
                  >
                    Copiar enlace
                  </button>
                  <button
                    type="button"
                    class="font-label rounded-lg bg-surface-container px-3 py-1.5 text-[11px] font-semibold text-on-surface hover:bg-surface-container-high"
                    @click="toggleTableQr"
                  >
                    {{ selectedTable.qrActive ? 'Desactivar QR' : 'Activar QR' }}
                  </button>
                  <button
                    type="button"
                    class="font-label rounded-lg bg-surface-container px-3 py-1.5 text-[11px] font-semibold text-on-surface hover:bg-surface-container-high"
                    @click="regenerateTableQr"
                  >
                    Regenerar QR
                  </button>
                  <a
                    v-if="selectedTableUrl && selectedTable.qrActive"
                    class="font-label rounded-lg bg-surface-container px-3 py-1.5 text-[11px] font-semibold text-on-surface hover:bg-surface-container-high"
                    :href="selectedTableUrl"
                    rel="noopener"
                    target="_blank"
                  >
                    Abrir como comensal ↗
                  </a>
                </div>
              </div>
            </div>
          </div>
          <p v-if="tableActionError" class="mt-3 text-xs text-error">{{ tableActionError }}</p>
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

      <TableFormDialog
        v-if="editingTable !== undefined"
        :table="editingTable"
        :existing-numbers="operation.tables.map((table) => table.number)"
        @close="editingTable = undefined"
        @save="saveTable"
      />

      <StaffOrderDialog
        v-if="staffOrderTable !== null"
        :restaurant="restaurant"
        :preset-table-number="staffOrderTable"
        @close="staffOrderTable = null"
        @created="refreshAttentions"
      />
    </template>
  </div>
</template>
