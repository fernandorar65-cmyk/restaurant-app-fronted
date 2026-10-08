<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'

import type { NewRestaurantDraft } from '@/modules/restaurants/api'
import { CURRENCY_OPTIONS, TIMEZONE_OPTIONS } from '@/modules/restaurants/site-labels'
import type { RestaurantCategory, RestaurantOperationalStatus, RestaurantSite } from '@/modules/restaurants/types'

const props = defineProps<{
  /** null = alta de una sede nueva. */
  restaurant: RestaurantSite | null
}>()

const emit = defineEmits<{
  close: []
  save: [draft: NewRestaurantDraft]
}>()

const CATEGORY_LABELS: Record<RestaurantCategory, string> = {
  'fine-dining': 'Alta cocina',
  bistro: 'Cava y bistró',
  lab: 'I+D y laboratorio',
}

const STATUS_LABELS: Record<RestaurantOperationalStatus, string> = {
  active: 'Activo',
  inactive: 'Inactivo',
  suspended: 'Suspendido',
}

const dialogEl = ref<HTMLDialogElement | null>(null)
const code = ref(props.restaurant?.code ?? '')
const name = ref(props.restaurant?.name ?? '')
const city = ref(props.restaurant?.city ?? '')
const address = ref(props.restaurant?.address ?? '')
const cuisine = ref(props.restaurant?.cuisine ?? '')
const imageUrl = ref(props.restaurant?.imageUrl ?? '')
const statusLabel = ref(props.restaurant?.statusLabel ?? 'Abierto')
const category = ref<RestaurantCategory>(props.restaurant?.category ?? 'bistro')
const status = ref<RestaurantOperationalStatus>(props.restaurant?.status ?? 'active')
const currency = ref(props.restaurant?.currency ?? 'EUR')
const timezone = ref(props.restaurant?.timezone ?? 'Europe/Madrid')
const formError = ref<string | null>(null)

function closeDialog(): void {
  dialogEl.value?.close()
}

function submit(): void {
  if (!name.value.trim() || !city.value.trim()) {
    formError.value = 'Indica al menos el nombre y la ciudad de la sede.'
    return
  }

  emit('save', {
    code: code.value.trim() || `SEDE-${Date.now().toString(36).toUpperCase()}`,
    imageUrl: imageUrl.value.trim() || 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=400&fit=crop&auto=format&q=70',
    currency: currency.value,
    timezone: timezone.value,
    name: name.value.trim(),
    city: city.value.trim(),
    address: address.value.trim(),
    cuisine: cuisine.value.trim(),
    status: status.value,
    statusLabel: statusLabel.value.trim(),
    category: category.value,
    categoryLabel: CATEGORY_LABELS[category.value],
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
    aria-labelledby="restaurant-dialog-title"
    @close="emit('close')"
  >
    <form class="max-h-[85vh] space-y-4 overflow-y-auto p-6" @submit.prevent="submit">
      <h2 id="restaurant-dialog-title" class="font-headline text-lg font-semibold text-on-surface">
        {{ restaurant ? 'Editar sede' : 'Nueva sede' }}
      </h2>

      <label v-if="!restaurant" class="block space-y-1.5">
        <span class="font-label text-xs font-semibold tracking-wide text-on-surface-variant uppercase">Código</span>
        <input
          v-model="code"
          class="w-full min-h-11 rounded-lg bg-surface px-3 py-2 text-sm text-on-surface shadow-inner outline-none ring-1 ring-transparent focus:ring-primary"
          placeholder="LIM-01-MIR"
          type="text"
        />
      </label>

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
          <span class="font-label text-xs font-semibold tracking-wide text-on-surface-variant uppercase">Ciudad</span>
          <input
            v-model="city"
            class="w-full min-h-11 rounded-lg bg-surface px-3 py-2 text-sm text-on-surface shadow-inner outline-none ring-1 ring-transparent focus:ring-primary"
            type="text"
          />
        </label>
        <label class="block space-y-1.5">
          <span class="font-label text-xs font-semibold tracking-wide text-on-surface-variant uppercase">Categoría</span>
          <select
            v-model="category"
            class="w-full min-h-11 rounded-lg bg-surface px-3 py-2 text-sm text-on-surface shadow-inner outline-none ring-1 ring-transparent focus:ring-primary"
          >
            <option v-for="(label, key) in CATEGORY_LABELS" :key="key" :value="key">{{ label }}</option>
          </select>
        </label>
      </div>

      <label class="block space-y-1.5">
        <span class="font-label text-xs font-semibold tracking-wide text-on-surface-variant uppercase">Dirección</span>
        <input
          v-model="address"
          class="w-full min-h-11 rounded-lg bg-surface px-3 py-2 text-sm text-on-surface shadow-inner outline-none ring-1 ring-transparent focus:ring-primary"
          type="text"
        />
      </label>

      <label class="block space-y-1.5">
        <span class="font-label text-xs font-semibold tracking-wide text-on-surface-variant uppercase">Cocina</span>
        <input
          v-model="cuisine"
          class="w-full min-h-11 rounded-lg bg-surface px-3 py-2 text-sm text-on-surface shadow-inner outline-none ring-1 ring-transparent focus:ring-primary"
          type="text"
        />
      </label>

      <label class="block space-y-1.5">
        <span class="font-label text-xs font-semibold tracking-wide text-on-surface-variant uppercase">Imagen (URL)</span>
        <input
          v-model="imageUrl"
          class="w-full min-h-11 rounded-lg bg-surface px-3 py-2 text-sm text-on-surface shadow-inner outline-none ring-1 ring-transparent focus:ring-primary"
          placeholder="https://…"
          type="url"
        />
      </label>

      <div class="grid grid-cols-2 gap-3">
        <label class="block space-y-1.5">
          <span class="font-label text-xs font-semibold tracking-wide text-on-surface-variant uppercase">Moneda</span>
          <select
            v-model="currency"
            class="w-full min-h-11 rounded-lg bg-surface px-3 py-2 text-sm text-on-surface shadow-inner outline-none ring-1 ring-transparent focus:ring-primary"
          >
            <option v-for="option in CURRENCY_OPTIONS" :key="option" :value="option">{{ option }}</option>
          </select>
        </label>
        <label class="block space-y-1.5">
          <span class="font-label text-xs font-semibold tracking-wide text-on-surface-variant uppercase">Zona horaria</span>
          <select
            v-model="timezone"
            class="w-full min-h-11 rounded-lg bg-surface px-3 py-2 text-sm text-on-surface shadow-inner outline-none ring-1 ring-transparent focus:ring-primary"
          >
            <option v-for="option in TIMEZONE_OPTIONS" :key="option" :value="option">{{ option }}</option>
          </select>
        </label>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <label class="block space-y-1.5">
          <span class="font-label text-xs font-semibold tracking-wide text-on-surface-variant uppercase">Estado operativo</span>
          <select
            v-model="status"
            class="w-full min-h-11 rounded-lg bg-surface px-3 py-2 text-sm text-on-surface shadow-inner outline-none ring-1 ring-transparent focus:ring-primary"
          >
            <option v-for="(label, key) in STATUS_LABELS" :key="key" :value="key">{{ label }}</option>
          </select>
        </label>
        <label class="block space-y-1.5">
          <span class="font-label text-xs font-semibold tracking-wide text-on-surface-variant uppercase">Descripción del estado</span>
          <input
            v-model="statusLabel"
            class="w-full min-h-11 rounded-lg bg-surface px-3 py-2 text-sm text-on-surface shadow-inner outline-none ring-1 ring-transparent focus:ring-primary"
            type="text"
          />
        </label>
      </div>

      <p class="text-xs text-on-surface-variant">
        Una sede inactiva o suspendida no aparece para los comensales y no puede abrir pedidos nuevos.
      </p>
      <p v-if="formError" class="rounded-lg bg-error-container px-3 py-2 text-xs text-on-error-container">{{ formError }}</p>

      <div class="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          class="font-label rounded-xl bg-surface-container min-h-11 px-4 py-2 text-sm font-semibold text-on-surface hover:bg-surface-container-high"
          @click="closeDialog"
        >
          Cancelar
        </button>
        <button
          type="submit"
          class="font-label rounded-xl bg-primary min-h-11 px-4 py-2 text-sm font-semibold text-on-primary hover:bg-primary-container"
        >
          Guardar
        </button>
      </div>
    </form>
  </dialog>
</template>
