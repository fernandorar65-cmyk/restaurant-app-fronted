<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'

import type { InventoryItem, InventoryItemDraft } from '@/modules/administration/types'
import type { RestaurantSite } from '@/modules/restaurants/types'

const props = defineProps<{
  item: InventoryItem | null
  restaurants: RestaurantSite[]
  defaultRestaurantId: string | null
}>()

const emit = defineEmits<{
  close: []
  save: [draft: InventoryItemDraft]
}>()

const UNITS = ['ud', 'kg', 'g', 'l', 'ml', 'botella', 'caja']

const dialogEl = ref<HTMLDialogElement | null>(null)
const restaurantId = ref(props.item?.restaurantId ?? props.defaultRestaurantId ?? props.restaurants[0]?.id ?? '')
const name = ref(props.item?.name ?? '')
const unit = ref(props.item?.unit ?? 'ud')
const stock = ref(props.item?.stock ?? 0)
const minStock = ref(props.item?.minStock ?? 0)
const supplier = ref(props.item?.supplier ?? '')
const isActive = ref(props.item?.isActive ?? true)
const formError = ref<string | null>(null)

function closeDialog(): void {
  dialogEl.value?.close()
}

function submit(): void {
  if (!name.value.trim() || !restaurantId.value) {
    formError.value = 'Indica el nombre y la sede del insumo.'
    return
  }

  if (stock.value < 0 || minStock.value < 0) {
    formError.value = 'Las cantidades no pueden ser negativas.'
    return
  }

  emit('save', {
    restaurantId: restaurantId.value,
    name: name.value.trim(),
    unit: unit.value.trim() || 'ud',
    stock: Number(stock.value) || 0,
    minStock: Number(minStock.value) || 0,
    supplier: supplier.value.trim(),
    isActive: isActive.value,
  })
}

onMounted(async () => {
  await nextTick()
  dialogEl.value?.showModal()
})
</script>

<template>
  <dialog
    ref="dialogEl"
    class="app-dialog overflow-hidden bg-surface-container-lowest p-0 text-on-surface" style="--dialog-width: 28rem"
    aria-labelledby="inventory-dialog-title"
    @close="emit('close')"
  >
    <form class="space-y-4 p-6" @submit.prevent="submit">
      <h2 id="inventory-dialog-title" class="font-headline text-lg font-semibold text-on-surface">
        {{ item ? `Editar ${item.name}` : 'Nuevo insumo' }}
      </h2>

      <label class="block space-y-1.5">
        <span class="font-label text-xs font-semibold tracking-wide text-on-surface-variant uppercase">Nombre</span>
        <input
          v-model="name"
          class="w-full min-h-11 rounded-lg bg-surface px-3 py-2 text-sm text-on-surface shadow-inner outline-none ring-1 ring-transparent focus:ring-primary"
          required
          type="text"
        />
      </label>

      <div class="grid grid-cols-2 gap-3">
        <label class="block space-y-1.5">
          <span class="font-label text-xs font-semibold tracking-wide text-on-surface-variant uppercase">Sede</span>
          <select
            v-model="restaurantId"
            class="w-full min-h-11 rounded-lg bg-surface px-3 py-2 text-sm text-on-surface shadow-inner outline-none ring-1 ring-transparent focus:ring-primary"
          >
            <option v-for="site in restaurants" :key="site.id" :value="site.id">{{ site.name }}</option>
          </select>
        </label>
        <label class="block space-y-1.5">
          <span class="font-label text-xs font-semibold tracking-wide text-on-surface-variant uppercase">Unidad</span>
          <input
            v-model="unit"
            class="w-full min-h-11 rounded-lg bg-surface px-3 py-2 text-sm text-on-surface shadow-inner outline-none ring-1 ring-transparent focus:ring-primary"
            list="inventory-units"
            type="text"
          />
          <datalist id="inventory-units">
            <option v-for="option in UNITS" :key="option" :value="option" />
          </datalist>
        </label>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <label class="block space-y-1.5">
          <span class="font-label text-xs font-semibold tracking-wide text-on-surface-variant uppercase">Cantidad actual</span>
          <input
            v-model.number="stock"
            class="w-full min-h-11 rounded-lg bg-surface px-3 py-2 text-sm text-on-surface shadow-inner outline-none ring-1 ring-transparent focus:ring-primary"
            min="0"
            step="any"
            type="number"
          />
        </label>
        <label class="block space-y-1.5">
          <span class="font-label text-xs font-semibold tracking-wide text-on-surface-variant uppercase">Cantidad mínima</span>
          <input
            v-model.number="minStock"
            class="w-full min-h-11 rounded-lg bg-surface px-3 py-2 text-sm text-on-surface shadow-inner outline-none ring-1 ring-transparent focus:ring-primary"
            min="0"
            step="any"
            type="number"
          />
        </label>
      </div>

      <label class="block space-y-1.5">
        <span class="font-label text-xs font-semibold tracking-wide text-on-surface-variant uppercase">Proveedor (referencia)</span>
        <input
          v-model="supplier"
          class="w-full min-h-11 rounded-lg bg-surface px-3 py-2 text-sm text-on-surface shadow-inner outline-none ring-1 ring-transparent focus:ring-primary"
          type="text"
        />
      </label>

      <label class="flex items-center gap-2 text-sm">
        <input v-model="isActive" type="checkbox" class="h-4 w-4 accent-primary" />
        Insumo activo
      </label>

      <p v-if="formError" class="rounded-lg bg-error-container px-3 py-2 text-xs text-on-error-container">{{ formError }}</p>

      <div class="flex justify-end gap-2">
        <button
          type="button"
          class="font-label rounded-xl bg-surface-container min-h-11 px-4 py-2 text-sm font-semibold text-on-surface hover:bg-surface-container-high"
          @click="closeDialog"
        >
          Cancelar
        </button>
        <button type="submit" class="font-label rounded-xl bg-primary min-h-11 px-4 py-2 text-sm font-semibold text-on-primary hover:bg-primary-container">
          Guardar
        </button>
      </div>
    </form>
  </dialog>
</template>
