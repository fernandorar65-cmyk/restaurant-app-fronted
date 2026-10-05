<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'

import { tableStatusLabel } from '@/modules/restaurants/site-labels'
import type { LiveTable, TableStatus } from '@/modules/restaurants/types'

const props = defineProps<{
  /** Mesa a editar; sin ella el diálogo crea una mesa nueva. */
  table?: LiveTable | null
  existingNumbers: string[]
}>()

const emit = defineEmits<{
  close: []
  save: [table: LiveTable]
}>()

const dialogEl = ref<HTMLDialogElement | null>(null)
const number = ref(props.table?.number ?? '')
const code = ref(props.table?.code ?? '')
const seats = ref(props.table?.seats ?? 2)
const location = ref(props.table?.location ?? 'Sala principal')
const status = ref<TableStatus>(props.table?.status ?? 'active')
const formError = ref<string | null>(null)

function closeDialog(): void {
  dialogEl.value?.close()
}

function submit(): void {
  const trimmed = number.value.trim()

  if (!trimmed) {
    formError.value = 'Indica el número de la mesa.'
    return
  }

  if (trimmed !== props.table?.number && props.existingNumbers.includes(trimmed)) {
    formError.value = `Ya existe la mesa ${trimmed}.`
    return
  }

  if (seats.value < 1) {
    formError.value = 'La mesa debe tener al menos una silla.'
    return
  }

  const base: LiveTable = props.table ?? {
    number: trimmed,
    code: '',
    status: 'active',
    seats: seats.value,
    occupiedSeats: 0,
    floorStatus: 'available',
    guests: 0,
    tagLabel: 'Nueva',
    tagTone: 'neutral',
    location: '',
    staff: 'Sin asignar',
    statusLabel: 'Libre',
    courseLabel: '—',
    dish: 'Mesa lista',
    note: '',
    qrToken: crypto.randomUUID().replace(/-/g, '').slice(0, 16),
    qrActive: true,
  }

  emit('save', {
    ...base,
    number: trimmed,
    code: code.value.trim() || `M-${trimmed}`,
    status: status.value,
    seats: seats.value,
    occupiedSeats: Math.min(base.occupiedSeats, seats.value),
    location: location.value.trim() || 'Sala principal',
    note: `${seats.value} sillas`,
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
    class="m-auto w-[min(100%-1.5rem,26rem)] overflow-hidden rounded-2xl bg-surface-container-lowest p-0 text-on-surface shadow-[0_24px_64px_rgba(27,28,29,0.18)] backdrop:bg-on-surface/45"
    aria-labelledby="table-dialog-title"
    @close="emit('close')"
  >
    <form class="space-y-4 p-6" @submit.prevent="submit">
      <h2 id="table-dialog-title" class="font-headline text-lg font-semibold text-on-surface">
        {{ table ? `Editar mesa ${table.number}` : 'Nueva mesa' }}
      </h2>

      <div class="grid grid-cols-3 gap-3">
        <label class="block space-y-1.5">
          <span class="font-label text-[11px] font-semibold tracking-wide text-on-surface-variant uppercase">Número</span>
          <input
            v-model="number"
            class="w-full rounded-lg bg-surface px-3 py-2 text-sm text-on-surface shadow-inner outline-none ring-1 ring-transparent focus:ring-primary"
            placeholder="13"
            required
            type="text"
          />
        </label>
        <label class="block space-y-1.5">
          <span class="font-label text-[11px] font-semibold tracking-wide text-on-surface-variant uppercase">Código</span>
          <input
            v-model="code"
            class="w-full rounded-lg bg-surface px-3 py-2 text-sm text-on-surface shadow-inner outline-none ring-1 ring-transparent focus:ring-primary"
            placeholder="M-13"
            type="text"
          />
        </label>
        <label class="block space-y-1.5">
          <span class="font-label text-[11px] font-semibold tracking-wide text-on-surface-variant uppercase">Sillas</span>
          <input
            v-model.number="seats"
            class="w-full rounded-lg bg-surface px-3 py-2 text-sm text-on-surface shadow-inner outline-none ring-1 ring-transparent focus:ring-primary"
            min="1"
            type="number"
          />
        </label>
      </div>

      <label class="block space-y-1.5">
        <span class="font-label text-[11px] font-semibold tracking-wide text-on-surface-variant uppercase">Ubicación / nombre</span>
        <input
          v-model="location"
          class="w-full rounded-lg bg-surface px-3 py-2 text-sm text-on-surface shadow-inner outline-none ring-1 ring-transparent focus:ring-primary"
          type="text"
        />
      </label>

      <label class="block space-y-1.5">
        <span class="font-label text-[11px] font-semibold tracking-wide text-on-surface-variant uppercase">Estado</span>
        <select
          v-model="status"
          class="w-full rounded-lg bg-surface px-3 py-2 text-sm text-on-surface shadow-inner outline-none ring-1 ring-transparent focus:ring-primary"
        >
          <option v-for="option in (['active', 'maintenance', 'inactive'] as const)" :key="option" :value="option">
            {{ tableStatusLabel[option] }}
          </option>
        </select>
        <span class="block text-[11px] text-on-surface-variant">Una mesa en mantenimiento o inactiva no puede abrir pedidos.</span>
      </label>

      <p v-if="formError" class="rounded-lg bg-error-container px-3 py-2 text-xs text-on-error-container">{{ formError }}</p>

      <div class="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          class="font-label rounded-xl bg-surface-container px-4 py-2 text-xs font-semibold text-on-surface hover:bg-surface-container-high"
          @click="closeDialog"
        >
          Cancelar
        </button>
        <button
          type="submit"
          class="font-label rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-on-primary hover:bg-primary-container"
        >
          {{ table ? 'Guardar' : 'Crear mesa' }}
        </button>
      </div>
    </form>
  </dialog>
</template>
