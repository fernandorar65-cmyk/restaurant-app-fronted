<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import AdminPageHeader from '@/components/base/AdminPageHeader.vue'
import { usePageTitle } from '@/composables/usePageTitle'
import { inventoryStatusClass, inventoryStatusLabel } from '@/modules/administration/admin-labels'
import {
  createInventoryItem,
  fetchInventoryItems,
  updateInventoryItem,
  updateInventoryStock,
} from '@/modules/administration/api'
import InventoryItemDialog from '@/modules/administration/components/InventoryItemDialog.vue'
import type { InventoryItem, InventoryItemDraft } from '@/modules/administration/types'
import { fetchRestaurants } from '@/modules/restaurants/api'
import type { RestaurantSite } from '@/modules/restaurants/types'
import { HttpError } from '@/services/http'
import { useSessionStore } from '@/stores/session'

usePageTitle('Inventario')

const session = useSessionStore()

const items = ref<InventoryItem[]>([])
const restaurants = ref<RestaurantSite[]>([])
const loadError = ref<string | null>(null)
const actionError = ref<string | null>(null)
const isLoading = ref(true)
const restaurantFilter = ref<'all' | string>('all')
const alertOnly = ref(false)
const showInactive = ref(false)
/** Cantidad que se está escribiendo para cada insumo antes de guardarla. */
const stockDraft = ref<Record<string, number>>({})
/** undefined = diálogo cerrado · null = nuevo insumo. */
const editingItem = ref<InventoryItem | null | undefined>(undefined)

const accessibleRestaurants = computed(() => restaurants.value.filter((site) => session.canAccessRestaurant(site.id)))

const restaurantName = (restaurantId: string): string =>
  restaurants.value.find((restaurant) => restaurant.id === restaurantId)?.name ?? restaurantId

const filteredItems = computed(() =>
  items.value.filter((item) => {
    if (!session.canAccessRestaurant(item.restaurantId)) {
      return false
    }

    if (restaurantFilter.value !== 'all' && item.restaurantId !== restaurantFilter.value) {
      return false
    }

    if (!showInactive.value && !item.isActive) {
      return false
    }

    return !(alertOnly.value && (item.status === 'ok' || !item.isActive))
  }),
)

const alertCount = computed(() => items.value.filter((item) => item.isActive && item.status !== 'ok').length)

async function loadInventory(): Promise<void> {
  isLoading.value = true
  loadError.value = null

  try {
    const [inventoryList, restaurantList] = await Promise.all([fetchInventoryItems(), fetchRestaurants()])
    items.value = inventoryList
    restaurants.value = restaurantList
  } catch (error) {
    loadError.value = error instanceof HttpError ? error.message : 'No se pudo cargar el inventario.'
  } finally {
    isLoading.value = false
  }
}

function replaceItem(updated: InventoryItem): void {
  items.value = items.value.map((current) => (current.id === updated.id ? updated : current))
}

async function setStock(item: InventoryItem, stock: number): Promise<void> {
  actionError.value = null

  try {
    replaceItem(await updateInventoryStock(item, stock))
    const next = { ...stockDraft.value }
    delete next[item.id]
    stockDraft.value = next
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : 'No se pudo actualizar el stock.'
  }
}

async function restock(item: InventoryItem): Promise<void> {
  await setStock(item, Math.max(item.minStock * 2, item.stock))
}

async function toggleActive(item: InventoryItem): Promise<void> {
  actionError.value = null

  try {
    replaceItem(
      await updateInventoryItem(item.id, {
        restaurantId: item.restaurantId,
        name: item.name,
        unit: item.unit,
        stock: item.stock,
        minStock: item.minStock,
        supplier: item.supplier,
        isActive: !item.isActive,
      }),
    )
  } catch {
    actionError.value = 'No se pudo actualizar el insumo.'
  }
}

async function saveItem(draft: InventoryItemDraft): Promise<void> {
  const original = editingItem.value
  actionError.value = null

  try {
    if (original) {
      replaceItem(await updateInventoryItem(original.id, draft))
    } else {
      items.value = [...items.value, await createInventoryItem(draft)]
    }

    editingItem.value = undefined
  } catch {
    actionError.value = 'No se pudo guardar el insumo.'
  }
}

onMounted(() => {
  void loadInventory()
})
</script>

<template>
  <div class="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 lg:px-8">
    <AdminPageHeader
      section="Inventario"
      title="Inventario básico"
      description="Registro manual de insumos por sede. Se marca en alerta lo que está por debajo del mínimo."
    >
      <template #actions>
        <button
          type="button"
          class="font-label rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-on-primary shadow-sm hover:bg-primary-container"
          @click="editingItem = null"
        >
          + Insumo
        </button>
      </template>
    </AdminPageHeader>

    <p v-if="isLoading" class="text-sm text-on-surface-variant">Cargando inventario…</p>
    <p
      v-else-if="loadError"
      class="rounded-lg border border-error-container bg-error-container px-3 py-2 text-sm text-on-error-container"
      role="alert"
    >
      {{ loadError }}
    </p>

    <template v-else>
      <p v-if="actionError" class="rounded-lg bg-error-container px-3 py-2 text-sm text-on-error-container" role="alert">
        {{ actionError }}
      </p>

      <div class="flex flex-col gap-3 rounded-xl bg-surface-container-lowest p-3 shadow-sm sm:flex-row sm:flex-wrap sm:items-center">
        <select
          v-model="restaurantFilter"
          class="rounded-lg bg-surface px-3 py-2 text-sm text-on-surface shadow-inner outline-none ring-1 ring-transparent focus:ring-primary"
          aria-label="Sede"
        >
          <option value="all">Todas mis sedes</option>
          <option v-for="restaurant in accessibleRestaurants" :key="restaurant.id" :value="restaurant.id">{{ restaurant.name }}</option>
        </select>
        <button
          type="button"
          class="font-label rounded-full px-3 py-1.5 text-[11px] font-semibold"
          :class="alertOnly ? 'bg-error-container text-on-error-container' : 'bg-surface-container text-on-surface-variant'"
          @click="alertOnly = !alertOnly"
        >
          Solo alertas ({{ alertCount }})
        </button>
        <button
          type="button"
          class="font-label rounded-full px-3 py-1.5 text-[11px] font-semibold"
          :class="showInactive ? 'bg-primary-container text-on-primary-container' : 'bg-surface-container text-on-surface-variant'"
          @click="showInactive = !showInactive"
        >
          {{ showInactive ? 'Mostrando inactivos' : 'Mostrar inactivos' }}
        </button>
      </div>

      <div class="overflow-x-auto rounded-2xl bg-surface-container-lowest shadow-sm">
        <table class="w-full min-w-[820px] text-left text-sm">
          <thead class="bg-surface-container-low text-on-surface-variant">
            <tr>
              <th class="font-label px-4 py-3 text-[11px] font-semibold tracking-wide uppercase">Insumo</th>
              <th class="font-label px-4 py-3 text-[11px] font-semibold tracking-wide uppercase">Sede</th>
              <th class="font-label px-4 py-3 text-[11px] font-semibold tracking-wide uppercase">Cantidad</th>
              <th class="font-label px-4 py-3 text-[11px] font-semibold tracking-wide uppercase">Estado</th>
              <th class="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-outline-variant/40">
            <tr v-for="item in filteredItems" :key="item.id" :class="item.isActive ? '' : 'opacity-50'">
              <td class="px-4 py-3">
                <p class="font-semibold text-on-surface">{{ item.name }}</p>
                <p class="text-xs text-on-surface-variant">{{ item.supplier || 'Sin proveedor' }}</p>
              </td>
              <td class="px-4 py-3 text-on-surface-variant">{{ restaurantName(item.restaurantId) }}</td>
              <td class="px-4 py-3">
                <div class="flex items-center gap-1.5">
                  <input
                    class="w-20 rounded-lg bg-surface px-2 py-1 text-sm text-on-surface shadow-inner outline-none ring-1 ring-transparent focus:ring-primary"
                    min="0"
                    step="any"
                    type="number"
                    :aria-label="`Cantidad de ${item.name}`"
                    :value="stockDraft[item.id] ?? item.stock"
                    @input="stockDraft = { ...stockDraft, [item.id]: Number(($event.target as HTMLInputElement).value) }"
                    @keydown.enter.prevent="setStock(item, stockDraft[item.id] ?? item.stock)"
                  />
                  <span class="text-xs text-on-surface-variant">{{ item.unit }} · mín. {{ item.minStock }}</span>
                  <button
                    v-if="stockDraft[item.id] !== undefined && stockDraft[item.id] !== item.stock"
                    type="button"
                    class="font-label rounded-lg bg-primary px-2 py-1 text-[11px] font-semibold text-on-primary"
                    @click="setStock(item, stockDraft[item.id] ?? item.stock)"
                  >
                    Guardar
                  </button>
                </div>
              </td>
              <td class="px-4 py-3">
                <span v-if="!item.isActive" class="font-label rounded-md bg-surface-container-high px-2 py-0.5 text-[10px] font-bold text-on-surface-variant uppercase">
                  Inactivo
                </span>
                <span v-else class="font-label rounded-md px-2 py-0.5 text-[10px] font-bold uppercase" :class="inventoryStatusClass[item.status]">
                  {{ inventoryStatusLabel[item.status] }}
                </span>
              </td>
              <td class="px-4 py-3">
                <div class="flex justify-end gap-1.5">
                  <button
                    v-if="item.isActive && item.status !== 'ok'"
                    type="button"
                    class="font-label rounded-lg bg-primary px-2.5 py-1.5 text-[11px] font-semibold text-on-primary hover:bg-primary-container"
                    @click="restock(item)"
                  >
                    Reabastecer
                  </button>
                  <button
                    type="button"
                    class="font-label rounded-lg bg-surface-container px-2.5 py-1.5 text-[11px] font-semibold text-on-surface hover:bg-surface-container-high"
                    @click="editingItem = item"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    class="font-label rounded-lg bg-surface-container px-2.5 py-1.5 text-[11px] font-semibold text-on-surface hover:bg-surface-container-high"
                    @click="toggleActive(item)"
                  >
                    {{ item.isActive ? 'Desactivar' : 'Activar' }}
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-if="filteredItems.length === 0" class="px-4 py-6 text-center text-sm text-on-surface-variant">
          No hay insumos que coincidan con el filtro.
        </p>
      </div>
    </template>

    <InventoryItemDialog
      v-if="editingItem !== undefined"
      :item="editingItem"
      :restaurants="accessibleRestaurants"
      :default-restaurant-id="restaurantFilter === 'all' ? null : restaurantFilter"
      @close="editingItem = undefined"
      @save="saveItem"
    />
  </div>
</template>
