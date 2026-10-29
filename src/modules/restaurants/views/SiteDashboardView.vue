<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

import SkeletonBlock from '@/components/base/SkeletonBlock.vue'
import KpiTile from '@/components/base/KpiTile.vue'
import SitePageHeader from '@/components/base/SitePageHeader.vue'
import StatusBadge from '@/components/base/StatusBadge.vue'
import { usePageTitle } from '@/composables/usePageTitle'
import { fetchAttentionsWithProductsBySite, isAttentionActive } from '@/modules/orders/api'
import StaffOrderDialog from '@/modules/orders/components/StaffOrderDialog.vue'
import { isBillableProduct, orderedProductStatusLabel, orderedProductStatusTone } from '@/modules/orders/order-status-labels'
import type { AttentionWithProducts } from '@/modules/orders/types'
import { fetchRestaurantById, fetchSiteOperation, updateSiteOperationFloors, updateSiteOperationTables } from '@/modules/restaurants/api'
import FloorsDialog from '@/modules/restaurants/components/FloorsDialog.vue'
import SiteFloorTable from '@/modules/restaurants/components/SiteFloorTable.vue'
import SiteTableCard from '@/modules/restaurants/components/SiteTableCard.vue'
import TableFormDialog from '@/modules/restaurants/components/TableFormDialog.vue'
import { floorStatusLabel, tableStatusLabel } from '@/modules/restaurants/site-labels'
import type {
  LiveTable,
  RestaurantSite,
  SiteOperation,
  TableFloorStatus,
  SiteFloor,
} from '@/modules/restaurants/types'
import { HttpError } from '@/services/http'
import { useConfirmStore } from '@/stores/confirm'
import { useSessionStore } from '@/stores/session'
import { useSiteActivityStore } from '@/stores/site-activity'
import { useToastStore } from '@/stores/toast'
import { formatMoney } from '@/utils/money'
import { formatTime } from '@/utils/time'

usePageTitle('Gestión de mesas')

const confirm = useConfirmStore()

const route = useRoute()
const session = useSessionStore()
const toast = useToastStore()
const activity = useSiteActivityStore()

const restaurant = ref<RestaurantSite | null>(null)
const operation = ref<SiteOperation | null>(null)
const loadError = ref<string | null>(null)
const isLoading = ref(true)
const floorFilter = ref<'all' | TableFloorStatus>('all')
/** Piso que se está viendo; 'all' = todos (agrupados por piso). */
const activeFloor = ref<'all' | string>('all')
const isEditingFloors = ref(false)
const isSavingFloors = ref(false)
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
  // Lo resuelve la guarda del router a partir del slug de la URL (/owner/sede/:siteSlug).
  return route.meta.siteId ?? null
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

const serviceStats = computed(() => {
  const active = attentions.value.filter(isAttentionActive)
  const products = active.flatMap((attention) => attention.products)

  return {
    open: active.length,
    accountRequested: active.filter((attention) => attention.status === 'account-requested').length,
    inKitchen: products.filter((product) => product.status === 'preparing').length,
    openTotal: products.filter((product) => isBillableProduct(product.status)).reduce((sum, p) => sum + p.subtotal, 0),
  }
})

const floors = computed(() => operation.value?.floors ?? [])
const hasFloors = computed(() => floors.value.length > 1)

/* Si el piso elegido deja de existir (o la sede queda con uno solo), se vuelve a "Todos". */
watch(floors, (list) => {
  if (activeFloor.value !== 'all' && !list.some((floor) => floor.id === activeFloor.value)) activeFloor.value = 'all'
})

const visibleTables = computed(() =>
  liveTables.value.filter(
    (table) =>
      (activeFloor.value === 'all' || table.floorId === activeFloor.value) &&
      (floorFilter.value === 'all' || table.floorStatus === floorFilter.value),
  ),
)

/** Con varios pisos y "Todos", las mesas se agrupan por piso; si no, un solo grupo. */
const tableGroups = computed(() => {
  if (!hasFloors.value || activeFloor.value !== 'all') {
    return [{ id: activeFloor.value, name: null as string | null, tables: visibleTables.value }]
  }

  return floors.value
    .map((floor) => ({ id: floor.id, name: floor.name as string | null, tables: visibleTables.value.filter((table) => table.floorId === floor.id) }))
    .filter((group) => group.tables.length > 0)
})

const floorCount = (id: string) => liveTables.value.filter((table) => table.floorId === id).length

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

const tableDetailEl = ref<HTMLElement | null>(null)

async function selectTable(number: string): Promise<void> {
  selectedTableNumber.value = number

  // En pantallas chicas el detalle queda debajo del plano: se lleva a la vista.
  if (window.matchMedia('(max-width: 1023px)').matches) {
    await nextTick()
    tableDetailEl.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
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

/** Mueve la mesa seleccionada a otro piso. */
/** Mueve una mesa a otro piso (desde el selector o arrastrándola). */
async function moveTable(tableNumber: string, floorId: string): Promise<void> {
  const currentOperation = operation.value
  const table = currentOperation?.tables.find((item) => item.number === tableNumber)

  if (!currentOperation || !table || table.floorId === floorId) {
    return
  }

  tableActionError.value = null

  try {
    operation.value = await updateSiteOperationTables(
      currentOperation.id,
      currentOperation.tables.map((item) => (item.number === tableNumber ? { ...item, floorId } : item)),
    )
    toast.show(`Mesa ${tableNumber} movida a ${floors.value.find((floor) => floor.id === floorId)?.name ?? 'otro piso'}`, { tone: 'success' })
  } catch {
    tableActionError.value = 'No se pudo mover la mesa de piso.'
  }
}

function moveSelectedTable(floorId: string): void {
  if (selectedTable.value) void moveTable(selectedTable.value.number, floorId)
}

/* ── Arrastrar mesas entre pisos ───────────────────────────────── */

const draggingTable = ref<LiveTable | null>(null)
const dropFloor = ref<string | null>(null)

/** Se puede soltar en cualquier piso distinto al de la mesa. */
function canDropOn(floorId: string): boolean {
  return draggingTable.value !== null && hasFloors.value && draggingTable.value.floorId !== floorId
}

function onTableDragStart(event: DragEvent, table: LiveTable): void {
  draggingTable.value = table
  event.dataTransfer?.setData('text/plain', table.number)
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}

function onTableDragEnd(): void {
  draggingTable.value = null
  dropFloor.value = null
}

function onFloorDragOver(event: DragEvent, floorId: string): void {
  if (canDropOn(floorId)) {
    event.preventDefault()
    dropFloor.value = floorId
  }
}

function onFloorDrop(floorId: string): void {
  const table = draggingTable.value
  onTableDragEnd()
  if (table && table.floorId !== floorId) void moveTable(table.number, floorId)
}

async function saveFloors(payload: { floors: SiteFloor[]; tables: LiveTable[] }): Promise<void> {
  const currentOperation = operation.value

  if (!currentOperation) {
    return
  }

  isSavingFloors.value = true
  tableActionError.value = null

  try {
    operation.value = await updateSiteOperationFloors(currentOperation.id, payload.floors, payload.tables)
    isEditingFloors.value = false
  } catch {
    tableActionError.value = 'No se pudieron guardar los pisos.'
  } finally {
    isSavingFloors.value = false
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

  const accepted = await confirm.ask({
    title: `¿Eliminar la mesa ${table.number}?`,
    message: 'Su código QR dejará de funcionar. Si es algo temporal, ponla en mantenimiento.',
    confirmLabel: 'Eliminar mesa',
    tone: 'danger',
  })

  if (!accepted) {
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
  <div class="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 lg:px-8">
    <SkeletonBlock v-if="isLoading" variant="page" />
    <p
      v-else-if="loadError"
      class="rounded-lg border border-error-container bg-error-container px-3 py-2 text-sm text-on-error-container"
      role="alert"
    >
      {{ loadError }}
    </p>

    <template v-else-if="restaurant && operation">
      <SitePageHeader
        :restaurant="restaurant"
        section="Gestión de mesas"
        title="Gestión de mesas"
        description="Plano, estado de las mesas, códigos QR y atenciones abiertas. La ocupación se calcula con los pedidos reales."
      >
        <template #actions>
          <RouterLink
            v-if="session.can('orders.manage')"
            class="font-label inline-flex min-h-11 items-center rounded-full bg-primary px-4 text-sm font-semibold whitespace-nowrap text-on-primary shadow-sm transition-colors hover:bg-primary-container"
            :to="{ name: 'site-orders', params: { siteSlug: restaurant.slug } }"
          >
            Ir a gestión de pedidos
          </RouterLink>
        </template>
      </SitePageHeader>

      <div class="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiTile
          label="Mesas ocupadas"
          :value="`${tableStats.tablesOccupied} / ${tableStats.tablesTotal}`"
          :hint="`${tableStats.tablesAvailable} libres${tableStats.tablesBlocked > 0 ? ` · ${tableStats.tablesBlocked} fuera de servicio` : ''}`"
        />
        <KpiTile label="Cubiertos" :value="`${tableStats.seatPercent}%`" :hint="`${tableStats.seatsOccupied} de ${tableStats.seatsTotal} sillas`">
          <div class="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-container-high" aria-hidden="true">
            <div class="h-full rounded-r-[4px] rounded-l-full bg-primary" :style="{ width: `${tableStats.seatPercent}%` }" />
          </div>
        </KpiTile>
        <KpiTile
          label="Atenciones abiertas"
          :value="serviceStats.open"
          :hint="`${serviceStats.inKitchen} en preparación · ${serviceStats.accountRequested} piden cuenta`"
        />
        <KpiTile label="Por cobrar" :value="formatMoney(serviceStats.openTotal, currency)" hint="Total de las atenciones abiertas" />
      </div>

      <div class="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <section class="rounded-2xl bg-surface-container-lowest p-5 shadow-sm sm:p-6 lg:col-span-12">
          <div class="flex flex-col justify-between gap-4 pb-4 sm:flex-row sm:items-start">
            <div>
              <h2 class="font-headline text-xl font-semibold text-on-surface">Plano de sala</h2>
              <p class="mt-1 text-sm text-on-surface-variant">
                Cada punto es una silla. Toca una mesa para ver su atención y su QR.
                <template v-if="hasFloors"> Arrastra una mesa a otro piso para moverla.</template>
              </p>
            </div>
            <div class="flex shrink-0 flex-wrap items-center gap-1.5">
              <button
                type="button"
                class="font-label inline-flex min-h-9 items-center gap-1.5 rounded-full bg-surface-container px-3 py-1.5 text-sm font-semibold text-on-surface hover:bg-surface-container-high"
                @click="isEditingFloors = true"
              >
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6.429 9.75 2.25 12l4.179 2.25m0-4.5 5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0 4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0-5.571 3-5.571-3" />
                </svg>
                Pisos{{ hasFloors ? ` (${floors.length})` : '' }}
              </button>
              <button
                type="button"
                class="font-label rounded-full bg-surface-container min-h-9 px-3 py-1.5 text-sm font-semibold text-on-surface hover:bg-surface-container-high"
                @click="printAllQrs"
              >
                Imprimir QR
              </button>
              <button
                type="button"
                class="font-label rounded-full bg-primary min-h-9 px-3 py-1.5 text-sm font-semibold text-on-primary hover:bg-primary-container"
                @click="editingTable = null"
              >
                + Mesa
              </button>
            </div>
          </div>

          <!-- Pestañas de piso: solo si la sede tiene más de uno -->
          <div v-if="hasFloors" class="-mx-1 mb-3 flex gap-1 overflow-x-auto border-b border-outline-variant/50 px-1" role="tablist" aria-label="Pisos">
            <button
              v-for="tab in [{ id: 'all', name: 'Todos', count: liveTables.length }, ...floors.map((floor) => ({ id: floor.id, name: floor.name, count: floorCount(floor.id) }))]"
              :key="tab.id"
              type="button"
              role="tab"
              :aria-selected="activeFloor === tab.id"
              class="font-label -mb-px inline-flex min-h-10 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-semibold transition-colors"
              :class="[
                activeFloor === tab.id ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface',
                tab.id !== 'all' && canDropOn(tab.id) ? 'rounded-t-lg bg-primary-fixed/40 text-primary' : '',
                tab.id !== 'all' && dropFloor === tab.id ? 'bg-primary-fixed! ring-2 ring-primary ring-inset' : '',
              ]"
              @click="activeFloor = tab.id"
              @dragover="tab.id !== 'all' && onFloorDragOver($event, tab.id)"
              @dragleave="dropFloor = dropFloor === tab.id ? null : dropFloor"
              @drop.prevent="tab.id !== 'all' && onFloorDrop(tab.id)"
            >
              {{ tab.name }}
              <span class="rounded-full bg-surface-container px-1.5 text-xs text-on-surface-variant">{{ tab.count }}</span>
            </button>
          </div>

          <div class="mb-4 flex flex-wrap gap-1.5" role="group" aria-label="Filtrar mesas por estado">
            <button
              v-for="filter in floorFilters"
              :key="filter.id"
              type="button"
              class="font-label min-h-9 rounded-full px-3 py-1.5 text-sm font-semibold"
              :class="
                floorFilter === filter.id
                  ? 'bg-primary-container text-on-primary-container'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
              "
              :aria-pressed="floorFilter === filter.id"
              @click="floorFilter = filter.id"
            >
              {{ filter.label }}
            </button>
          </div>

          <div class="space-y-5">
            <div
              v-for="group in tableGroups"
              :key="group.id"
              class="rounded-xl transition-[background-color,box-shadow]"
              :class="[
                group.name && canDropOn(group.id) ? 'bg-primary-fixed/25 outline-2 outline-dashed outline-primary/50 outline-offset-4' : '',
                group.name && dropFloor === group.id ? 'bg-primary-fixed/50' : '',
              ]"
              @dragover="group.name && onFloorDragOver($event, group.id)"
              @dragleave="dropFloor = dropFloor === group.id ? null : dropFloor"
              @drop.prevent="group.name && onFloorDrop(group.id)"
            >
              <h3 v-if="group.name" class="font-label mb-2 flex items-center gap-2 text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
                {{ group.name }}
                <span class="h-px flex-1 bg-outline-variant/50" aria-hidden="true" />
              </h3>
              <div class="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-8 2xl:grid-cols-10">
                <SiteFloorTable
                  v-for="table in group.tables"
                  :key="table.number"
                  :table="table"
                  :selected="table.number === selectedTableNumber"
                  :draggable="hasFloors"
                  :class="[hasFloors ? 'cursor-grab active:cursor-grabbing' : '', draggingTable?.number === table.number ? 'opacity-40' : '']"
                  :title="hasFloors ? 'Arrastra la mesa a otra pestaña o sección para cambiarla de piso' : undefined"
                  @select="selectTable(table.number)"
                  @dragstart="onTableDragStart($event, table)"
                  @dragend="onTableDragEnd"
                />
              </div>
            </div>
          </div>
          <p v-if="visibleTables.length === 0" class="pt-4 text-sm text-on-surface-variant">
            {{
              liveTables.length === 0
                ? 'Esta sede todavía no tiene mesas. Usa "+ Mesa" para agregar la primera.'
                : activeFloor !== 'all' && floorCount(activeFloor) === 0
                  ? 'Este piso todavía no tiene mesas. Usa "+ Mesa" para agregar una.'
                  : 'No hay mesas en este estado.'
            }}
          </p>

          <div v-if="selectedTable" ref="tableDetailEl" class="mt-6 scroll-mt-20 border-t border-outline-variant/50 pt-5">
            <div class="mb-3 flex items-center justify-between gap-3">
              <h3 class="font-label flex items-center gap-2 text-xs font-semibold tracking-widest text-on-surface-variant uppercase">
                Mesa seleccionada · {{ selectedTable.code }}
                <span
                  class="rounded px-1.5 py-0.5 text-xs normal-case tracking-normal"
                  :class="selectedTable.status === 'active' ? 'bg-primary/10 text-primary' : 'bg-error-container text-on-error-container'"
                >
                  {{ tableStatusLabel[selectedTable.status] }}
                </span>
              </h3>
              <div class="flex gap-1.5">
                <button
                  type="button"
                  class="font-label rounded-full bg-surface-container min-h-9 px-3 py-1.5 text-sm font-semibold text-on-surface hover:bg-surface-container-high"
                  @click="editingTable = selectedTable"
                >
                  Editar
                </button>
                <button
                  type="button"
                  class="font-label rounded-lg bg-error-container min-h-9 px-3 py-1.5 text-sm font-semibold text-on-error-container hover:bg-error/20"
                  @click="removeSelectedTable"
                >
                  Eliminar
                </button>
              </div>
            </div>
            <SiteTableCard :table="selectedTable" highlight />

            <label v-if="hasFloors" class="mt-3 flex flex-wrap items-center gap-2 text-sm text-on-surface-variant">
              <span>Piso</span>
              <select
                :value="selectedTable.floorId"
                class="min-h-9 rounded-lg bg-surface-container px-3 text-sm font-semibold text-on-surface outline-none focus:ring-2 focus:ring-primary"
                :aria-label="`Mover la mesa ${selectedTable.number} a otro piso`"
                @change="moveSelectedTable(($event.target as HTMLSelectElement).value)"
              >
                <option v-for="floor in floors" :key="floor.id" :value="floor.id">{{ floor.name }}</option>
              </select>
              <span class="text-xs">Cámbialo para mover la mesa de piso.</span>
            </label>

            <div class="mt-4 space-y-3 rounded-xl bg-surface p-4">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <p class="font-label text-xs font-semibold tracking-wider text-on-surface-variant uppercase">Atención activa</p>
                <div v-if="session.can('orders.manage') && selectedTable.status === 'active'" class="flex gap-1.5">
                  <RouterLink
                    v-if="selectedAttention"
                    class="font-label rounded-full bg-surface-container min-h-9 px-3 py-1.5 text-sm font-semibold text-on-surface hover:bg-surface-container-high"
                    :to="{ name: 'site-order-detail', params: { siteSlug: restaurant.slug, attentionId: selectedAttention.id } }"
                  >
                    Ver detalle
                  </RouterLink>
                  <button
                    type="button"
                    class="font-label rounded-full bg-primary min-h-9 px-3 py-1.5 text-sm font-semibold text-on-primary hover:bg-primary-container"
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
                    <StatusBadge :tone="orderedProductStatusTone[product.status]" :label="orderedProductStatusLabel[product.status]" />
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
                  <p class="font-label text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
                    Enlace de la mesa (QR de acceso al menú)
                  </p>
                  <span
                    class="font-label rounded px-1.5 py-0.5 text-xs font-bold uppercase"
                    :class="selectedTable.qrActive ? 'bg-primary/10 text-primary' : 'bg-error-container text-on-error-container'"
                  >
                    {{ selectedTable.qrActive ? 'QR activo' : 'QR desactivado' }}
                  </span>
                </div>
                <p class="mt-1 truncate text-xs text-on-surface-variant">{{ selectedTableUrl }}</p>
                <div class="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    class="font-label rounded-full bg-surface-container min-h-9 px-3 py-1.5 text-sm font-semibold text-on-surface hover:bg-surface-container-high"
                    @click="copyTableLink"
                  >
                    Copiar enlace
                  </button>
                  <button
                    type="button"
                    class="font-label rounded-full bg-surface-container min-h-9 px-3 py-1.5 text-sm font-semibold text-on-surface hover:bg-surface-container-high"
                    @click="toggleTableQr"
                  >
                    {{ selectedTable.qrActive ? 'Desactivar QR' : 'Activar QR' }}
                  </button>
                  <button
                    type="button"
                    class="font-label rounded-full bg-surface-container min-h-9 px-3 py-1.5 text-sm font-semibold text-on-surface hover:bg-surface-container-high"
                    @click="regenerateTableQr"
                  >
                    Regenerar QR
                  </button>
                  <a
                    v-if="selectedTableUrl && selectedTable.qrActive"
                    class="font-label rounded-full bg-surface-container min-h-9 px-3 py-1.5 text-sm font-semibold text-on-surface hover:bg-surface-container-high"
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

      </div>

      <TableFormDialog
        v-if="editingTable !== undefined"
        :table="editingTable"
        :existing-numbers="operation.tables.map((table) => table.number)"
        :floors="floors"
        :default-floor-id="activeFloor === 'all' ? null : activeFloor"
        @close="editingTable = undefined"
        @save="saveTable"
      />

      <FloorsDialog
        v-if="isEditingFloors"
        :floors="floors"
        :tables="operation.tables"
        :saving="isSavingFloors"
        @close="isEditingFloors = false"
        @save="saveFloors"
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
