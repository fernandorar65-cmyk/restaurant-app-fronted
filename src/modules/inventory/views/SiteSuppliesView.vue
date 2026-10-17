<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import BaseButton from '@/components/base/BaseButton.vue'
import BasePagination from '@/components/base/BasePagination.vue'
import KpiTile from '@/components/base/KpiTile.vue'
import SitePageHeader from '@/components/base/SitePageHeader.vue'
import SkeletonBlock from '@/components/base/SkeletonBlock.vue'
import StatusBadge from '@/components/base/StatusBadge.vue'
import { usePageTitle } from '@/composables/usePageTitle'
import { useSiteContext } from '@/composables/useSiteContext'
import { inventoryStatusLabel, inventoryStatusTone } from '@/modules/administration/admin-labels'
import { createSupply, fetchMovements, fetchSupplies, registerMovement, updateSupply } from '@/modules/inventory/api'
import MovementDialog from '@/modules/inventory/components/MovementDialog.vue'
import SupplyDialog from '@/modules/inventory/components/SupplyDialog.vue'
import { MOVEMENT_TYPES, movementTypeLabel, SUPPLY_CATEGORIES, supplyCategoryLabel } from '@/modules/inventory/types'
import type { MovementDraft, MovementType, StockMovement, Supply, SupplyCategory, SupplyDraft } from '@/modules/inventory/types'
import { errorMessage } from '@/modules/orders/api'
import type { RestaurantSite } from '@/modules/restaurants/types'
import { useSessionStore } from '@/stores/session'
import { useToastStore } from '@/stores/toast'
import { formatMoney } from '@/utils/money'

usePageTitle('Insumos')

const route = useRoute()
const router = useRouter()
const session = useSessionStore()
const toast = useToastStore()

const supplies = ref<Supply[]>([])
const movements = ref<StockMovement[]>([])

const { restaurant, restaurantId, currency, isLoading, loadError } = useSiteContext(load)

async function load(site?: RestaurantSite): Promise<void> {
  const id = site?.id ?? restaurantId.value
  if (!id) return
  const [items, history] = await Promise.all([fetchSupplies(id), fetchMovements(id)])
  supplies.value = items
  movements.value = history
}

// Pestañas: ?vista=movimientos (&insumo=id para ver el historial de uno)
const tab = computed<'stock' | 'movimientos'>(() => (route.query.vista === 'movimientos' ? 'movimientos' : 'stock'))
const itemFilter = computed(() => (typeof route.query.insumo === 'string' ? route.query.insumo : null))

function selectTab(next: 'stock' | 'movimientos', itemId: string | null = null): void {
  void router.replace({ query: { vista: next === 'movimientos' ? 'movimientos' : undefined, insumo: itemId ?? undefined } })
}

const format = (value: number) => new Intl.NumberFormat('es', { maximumFractionDigits: 3 }).format(value)

// ── Stock ──────────────────────────────────────────────
const active = computed(() => supplies.value.filter((item) => item.isActive))
const toRestock = computed(() => active.value.filter((item) => item.status !== 'ok'))
const outOfStock = computed(() => active.value.filter((item) => item.stock <= 0))
const inventoryValue = computed(() => active.value.reduce((sum, item) => sum + item.stock * item.unitCost, 0))

const search = ref('')
const categoryFilter = ref<SupplyCategory | 'all'>('all')
const statusFilter = ref<'all' | 'restock' | 'inactive'>('all')

const normalize = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

const filtered = computed(() => {
  const term = normalize(search.value.trim())
  return supplies.value
    .filter((item) => (statusFilter.value === 'inactive' ? !item.isActive : item.isActive))
    .filter((item) => statusFilter.value !== 'restock' || item.status !== 'ok')
    .filter((item) => categoryFilter.value === 'all' || item.category === categoryFilter.value)
    .filter((item) => !term || normalize(`${item.name} ${item.supplier}`).includes(term))
    // Primero lo que hay que reponer
    .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name, 'es'))
})
const rank = (item: Supply) => (item.status === 'critical' ? 0 : item.status === 'low' ? 1 : 2)

const stockPage = ref(1)
const stockPageSize = ref(15)
watch([search, categoryFilter, statusFilter], () => (stockPage.value = 1))
const stockRows = computed(() => filtered.value.slice((stockPage.value - 1) * stockPageSize.value, stockPage.value * stockPageSize.value))

/** Barra de nivel: el mínimo queda a la mitad de la barra. */
const level = (item: Supply) => (item.minStock > 0 ? Math.min(100, (item.stock / (item.minStock * 2)) * 100) : item.stock > 0 ? 100 : 0)
const levelColor = (item: Supply) => (item.status === 'critical' ? 'bg-error' : item.status === 'low' ? 'bg-warning' : 'bg-success')

// ── Movimientos ────────────────────────────────────────
const typeFilter = ref<MovementType | 'all'>('all')
const filteredMovements = computed(() =>
  movements.value
    .filter((movement) => !itemFilter.value || movement.itemId === itemFilter.value)
    .filter((movement) => typeFilter.value === 'all' || movement.type === typeFilter.value),
)
const filteredItemName = computed(() =>
  itemFilter.value ? (supplies.value.find((item) => item.id === itemFilter.value)?.name ?? movements.value.find((m) => m.itemId === itemFilter.value)?.itemName ?? 'Insumo') : null,
)
const movementPage = ref(1)
const movementPageSize = ref(15)
watch([typeFilter, itemFilter], () => (movementPage.value = 1))
const movementRows = computed(() =>
  filteredMovements.value.slice((movementPage.value - 1) * movementPageSize.value, movementPage.value * movementPageSize.value),
)

/** Resumen del mes en curso: compras y mermas valorizadas. */
const monthKey = new Date().toISOString().slice(0, 7)
const monthMovements = computed(() => movements.value.filter((movement) => movement.createdAt.slice(0, 7) === monthKey))
const monthPurchases = computed(() =>
  monthMovements.value.filter((m) => m.type === 'purchase').reduce((sum, m) => sum + m.delta * (m.unitCost ?? 0), 0),
)
const monthWaste = computed(() =>
  monthMovements.value
    .filter((m) => m.type === 'waste')
    .reduce((sum, m) => sum + Math.abs(m.delta) * (supplies.value.find((item) => item.id === m.itemId)?.unitCost ?? 0), 0),
)

const movementTone: Record<MovementType, string> = {
  purchase: 'bg-success-container text-on-success-container',
  usage: 'bg-surface-container text-on-surface-variant',
  waste: 'bg-error-container text-on-error-container',
  count: 'bg-secondary-container text-on-secondary-container',
}

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: restaurant.value?.timezone }).format(new Date(iso))
}

// ── Diálogos ───────────────────────────────────────────
const supplyDialog = ref<{ item: Supply | null } | null>(null)
const movementDialog = ref<{ item: Supply; type: MovementType } | null>(null)
const saving = ref(false)
const canRegisterExpense = computed(() => session.can('payments.manage'))

async function saveSupply(draft: SupplyDraft): Promise<void> {
  if (!supplyDialog.value || !restaurantId.value) return
  saving.value = true
  try {
    const current = supplyDialog.value.item
    const saved = current ? await updateSupply(current, draft) : await createSupply(restaurantId.value, draft)
    supplies.value = current ? supplies.value.map((item) => (item.id === saved.id ? saved : item)) : [...supplies.value, saved]
    toast.show(current ? 'Insumo actualizado' : 'Insumo creado', { message: saved.name, tone: 'success', durationMs: 3000 })
    supplyDialog.value = null
  } catch (error) {
    toast.show('No se pudo guardar el insumo', { message: errorMessage(error, 'Inténtalo de nuevo.'), tone: 'error' })
  } finally {
    saving.value = false
  }
}

async function saveMovement(draft: MovementDraft): Promise<void> {
  if (!movementDialog.value) return
  saving.value = true
  try {
    const { item, movement } = await registerMovement(movementDialog.value.item, draft, session.user?.name ?? null)
    supplies.value = supplies.value.map((current) => (current.id === item.id ? item : current))
    movements.value = [movement, ...movements.value]
    toast.show(`${movementTypeLabel[movement.type]} ${movement.type === 'count' ? 'registrado' : 'registrada'}`, {
      message: `${item.name}: ${format(item.stock)} ${item.unit}${movement.expenseId ? ' · también en Gastos' : ''}`,
      tone: item.status === 'ok' ? 'success' : 'warning',
      durationMs: 4000,
    })
    movementDialog.value = null
  } catch (error) {
    toast.show('No se pudo registrar el movimiento', { message: errorMessage(error, 'Inténtalo de nuevo.'), tone: 'error' })
  } finally {
    saving.value = false
  }
}

const chipClass = (active: boolean) =>
  active ? 'bg-primary-container text-on-primary-container' : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
const iconButton = 'flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
</script>

<template>
  <div class="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 lg:px-8">
    <SkeletonBlock v-if="isLoading" variant="page" />
    <p v-else-if="loadError" class="rounded-lg border border-error-container bg-error-container px-3 py-2 text-sm text-on-error-container" role="alert">
      {{ loadError }}
    </p>

    <template v-else-if="restaurant">
      <SitePageHeader
        :restaurant="restaurant"
        section="Insumos"
        title="Inventario de insumos"
        description="Controla el stock de la despensa: registra compras, consumos, mermas y conteos, y repón antes de quedarte sin nada."
      >
        <template #actions>
          <BaseButton variant="primary" @click="supplyDialog = { item: null }">+ Nuevo insumo</BaseButton>
        </template>
      </SitePageHeader>

      <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile label="Insumos activos" :value="active.length" />
        <KpiTile label="Por reponer" :value="toRestock.length" :tone="toRestock.length > 0 ? 'warning' : 'default'" :hint="toRestock.length === 0 ? 'Todo sobre el mínimo' : outOfStock.length ? `${outOfStock.length} agotados` : 'Bajo el stock mínimo'" />
        <KpiTile label="Valor del inventario" :value="formatMoney(inventoryValue, currency)" hint="Stock × último costo" />
        <KpiTile label="Compras del mes" :value="formatMoney(monthPurchases, currency)" :hint="`Mermas: ${formatMoney(monthWaste, currency)}`" />
      </div>

      <div class="inline-flex gap-1 rounded-xl bg-surface-container p-1" role="tablist" aria-label="Secciones de insumos">
        <button
          v-for="option in ([['stock', 'Stock'], ['movimientos', 'Movimientos']] as const)"
          :key="option[0]"
          type="button"
          role="tab"
          :aria-selected="tab === option[0]"
          class="font-label min-h-9 rounded-lg px-4 text-sm font-semibold transition-colors"
          :class="tab === option[0] ? 'bg-surface-container-lowest text-on-surface shadow-sm' : 'text-on-surface-variant hover:text-on-surface'"
          @click="selectTab(option[0])"
        >
          {{ option[1] }}
        </button>
      </div>

      <!-- ── Stock ── -->
      <section v-if="tab === 'stock'" class="space-y-3">
        <div class="flex flex-wrap items-center gap-2">
          <input
            v-model="search"
            type="search"
            placeholder="Buscar insumo o proveedor"
            aria-label="Buscar insumo"
            class="min-h-10 w-full rounded-xl bg-surface-container-lowest px-3 text-sm text-on-surface shadow-sm outline-none ring-1 ring-outline-variant/40 placeholder:text-outline focus:ring-2 focus:ring-primary sm:w-64"
          />
          <select v-model="categoryFilter" aria-label="Categoría" class="min-h-10 rounded-xl bg-surface-container px-3 text-sm font-semibold text-on-surface-variant outline-none">
            <option value="all">Todas las categorías</option>
            <option v-for="category in SUPPLY_CATEGORIES" :key="category" :value="category">{{ supplyCategoryLabel[category] }}</option>
          </select>
          <div class="flex gap-1">
            <button type="button" class="font-label min-h-10 rounded-full px-3 text-sm font-semibold" :class="chipClass(statusFilter === 'all')" @click="statusFilter = 'all'">Todos</button>
            <button type="button" class="font-label min-h-10 rounded-full px-3 text-sm font-semibold" :class="chipClass(statusFilter === 'restock')" @click="statusFilter = 'restock'">
              Por reponer ({{ toRestock.length }})
            </button>
            <button type="button" class="font-label min-h-10 rounded-full px-3 text-sm font-semibold" :class="chipClass(statusFilter === 'inactive')" @click="statusFilter = 'inactive'">Inactivos</button>
          </div>
        </div>

        <p v-if="filtered.length === 0" class="rounded-2xl bg-surface-container-lowest p-6 text-center text-sm text-on-surface-variant shadow-sm">
          {{ supplies.length === 0 ? 'Todavía no hay insumos. Crea el primero con «+ Nuevo insumo».' : 'Ningún insumo coincide con los filtros.' }}
        </p>

        <ul v-else class="divide-y divide-outline-variant/40 overflow-hidden rounded-2xl bg-surface-container-lowest shadow-sm">
          <li v-for="item in stockRows" :key="item.id" class="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:flex-nowrap" :class="item.isActive ? '' : 'opacity-60'">
            <div class="min-w-0 flex-1 basis-full sm:basis-auto">
              <p class="truncate text-sm font-semibold text-on-surface">{{ item.name }}</p>
              <p class="truncate text-xs text-on-surface-variant">
                {{ supplyCategoryLabel[item.category] }}<template v-if="item.supplier"> · {{ item.supplier }}</template>
                <template v-if="item.unitCost"> · {{ formatMoney(item.unitCost, currency) }}/{{ item.unit }}</template>
              </p>
            </div>

            <div class="w-full space-y-1 sm:w-48">
              <div class="flex items-baseline justify-between gap-2 text-xs">
                <span class="text-sm font-semibold text-on-surface tabular-nums">{{ format(item.stock) }} {{ item.unit }}</span>
                <span class="text-on-surface-variant tabular-nums">mín. {{ format(item.minStock) }}</span>
              </div>
              <div class="relative h-1.5 overflow-hidden rounded-full bg-surface-container" role="presentation">
                <span class="absolute inset-y-0 left-0 rounded-full" :class="levelColor(item)" :style="{ width: `${Math.max(item.stock > 0 ? 3 : 0, level(item))}%` }" />
                <span class="absolute inset-y-0 left-1/2 w-px bg-outline" aria-hidden="true" />
              </div>
            </div>

            <div class="shrink-0 sm:w-24">
              <StatusBadge :tone="item.stock <= 0 ? 'danger' : inventoryStatusTone[item.status]" :label="item.stock <= 0 ? 'Agotado' : inventoryStatusLabel[item.status]" />
            </div>

            <div class="ml-auto flex shrink-0 items-center gap-0.5">
              <BaseButton size="sm" variant="secondary" @click="movementDialog = { item, type: 'purchase' }">+ Entrada</BaseButton>
              <button type="button" :class="iconButton" :aria-label="`Salida o merma de ${item.name}`" title="Salida, merma o conteo" @click="movementDialog = { item, type: 'usage' }">
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                </svg>
              </button>
              <button type="button" :class="iconButton" :aria-label="`Historial de ${item.name}`" title="Historial" @click="selectTab('movimientos', item.id)">
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </button>
              <button type="button" :class="iconButton" :aria-label="`Editar ${item.name}`" title="Editar" @click="supplyDialog = { item }">
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Z" />
                </svg>
              </button>
            </div>
          </li>
        </ul>

        <BasePagination v-if="filtered.length > 0" v-model:page="stockPage" v-model:page-size="stockPageSize" :total="filtered.length" item-label="insumos" />
      </section>

      <!-- ── Movimientos ── -->
      <section v-else class="space-y-3">
        <div class="flex flex-wrap items-center gap-2">
          <span v-if="filteredItemName" class="font-label inline-flex min-h-10 items-center gap-2 rounded-full bg-primary-container pr-1 pl-3 text-sm font-semibold text-on-primary-container">
            {{ filteredItemName }}
            <button type="button" class="flex h-8 w-8 items-center justify-center rounded-full hover:bg-on-primary-container/10" aria-label="Ver todos los insumos" @click="selectTab('movimientos')">
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
            </button>
          </span>
          <button type="button" class="font-label min-h-10 rounded-full px-3 text-sm font-semibold" :class="chipClass(typeFilter === 'all')" @click="typeFilter = 'all'">Todos</button>
          <button
            v-for="type in MOVEMENT_TYPES"
            :key="type"
            type="button"
            class="font-label min-h-10 rounded-full px-3 text-sm font-semibold"
            :class="chipClass(typeFilter === type)"
            @click="typeFilter = type"
          >
            {{ movementTypeLabel[type] }}s
          </button>
        </div>

        <p v-if="filteredMovements.length === 0" class="rounded-2xl bg-surface-container-lowest p-6 text-center text-sm text-on-surface-variant shadow-sm">
          No hay movimientos registrados{{ filteredItemName ? ` para ${filteredItemName}` : '' }}.
        </p>

        <ul v-else class="divide-y divide-outline-variant/40 overflow-hidden rounded-2xl bg-surface-container-lowest shadow-sm">
          <li v-for="movement in movementRows" :key="movement.id" class="flex items-center gap-3 px-4 py-3">
            <span class="font-label w-20 shrink-0 rounded-full px-2 py-0.5 text-center text-xs font-semibold" :class="movementTone[movement.type]">
              {{ movementTypeLabel[movement.type] }}
            </span>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-semibold text-on-surface">{{ movement.itemName }}</p>
              <p class="truncate text-xs text-on-surface-variant">
                {{ formatDateTime(movement.createdAt) }}
                <template v-if="movement.createdBy"> · {{ movement.createdBy }}</template>
                <template v-if="movement.reason"> · {{ movement.reason }}</template>
                <template v-if="movement.expenseId"> · en Gastos</template>
              </p>
            </div>
            <div class="shrink-0 text-right">
              <p class="text-sm font-semibold tabular-nums" :class="movement.delta > 0 ? 'text-success' : movement.delta < 0 ? 'text-on-surface' : 'text-on-surface-variant'">
                {{ movement.delta > 0 ? '+' : '' }}{{ format(movement.delta) }} {{ movement.unit }}
              </p>
              <p class="text-xs text-on-surface-variant tabular-nums">
                queda {{ format(movement.stockAfter) }}
                <template v-if="movement.type === 'purchase' && movement.unitCost"> · {{ formatMoney(movement.delta * movement.unitCost, currency) }}</template>
              </p>
            </div>
          </li>
        </ul>

        <BasePagination
          v-if="filteredMovements.length > 0"
          v-model:page="movementPage"
          v-model:page-size="movementPageSize"
          :total="filteredMovements.length"
          item-label="movimientos"
        />
      </section>

      <SupplyDialog v-if="supplyDialog" :item="supplyDialog.item" :currency="currency" :saving="saving" @close="supplyDialog = null" @save="saveSupply" />
      <MovementDialog
        v-if="movementDialog"
        :item="movementDialog.item"
        :initial-type="movementDialog.type"
        :currency="currency"
        :saving="saving"
        :can-register-expense="canRegisterExpense"
        @close="movementDialog = null"
        @save="saveMovement"
      />
    </template>
  </div>
</template>
