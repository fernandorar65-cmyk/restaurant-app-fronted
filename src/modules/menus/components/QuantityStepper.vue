<script setup lang="ts">
/**
 * - `default`: botón "Agregar" y, con cantidad, contador en píldora.
 * - `floating`: botón redondo "+" que flota sobre la foto del producto (estilo apps de delivery).
 * Con una sola unidad, el botón de restar muestra una papelera: restar quita el producto.
 */
withDefaults(
  defineProps<{
    quantity: number
    label: string
    variant?: 'default' | 'floating'
  }>(),
  { variant: 'default' },
)

const emit = defineEmits<{
  increase: []
  decrease: []
}>()

const PLUS = 'M12 4.5v15m7.5-7.5h-15'
const MINUS = 'M5 12h14'
const TRASH =
  'm14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0'
</script>

<template>
  <button
    v-if="quantity === 0 && variant === 'floating'"
    type="button"
    class="flex h-11 w-11 items-center justify-center rounded-full bg-surface-container-lowest text-primary shadow-md ring-1 ring-outline-variant/40 transition-transform hover:scale-105 active:scale-95"
    :aria-label="`Agregar ${label}`"
    @click="emit('increase')"
  >
    <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.6" aria-hidden="true">
      <path stroke-linecap="round" stroke-linejoin="round" :d="PLUS" />
    </svg>
  </button>
  <button
    v-else-if="quantity === 0"
    type="button"
    class="font-label inline-flex min-h-11 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary-container"
    :aria-label="`Agregar ${label}`"
    @click="emit('increase')"
  >
    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.4" aria-hidden="true">
      <path stroke-linecap="round" stroke-linejoin="round" :d="PLUS" />
    </svg>
    Agregar
  </button>
  <div
    v-else
    class="inline-flex items-center rounded-full p-0.5"
    :class="variant === 'floating' ? 'bg-surface-container-lowest shadow-md ring-1 ring-outline-variant/40' : 'bg-primary-fixed'"
  >
    <button
      type="button"
      class="flex h-11 w-11 items-center justify-center rounded-full transition-colors"
      :class="variant === 'floating' ? 'text-primary hover:bg-surface-container' : 'text-on-primary-fixed hover:bg-surface-container-lowest/60'"
      :aria-label="quantity === 1 ? `Quitar ${label}` : `Quitar una unidad de ${label}`"
      @click="emit('decrease')"
    >
      <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" :stroke-width="quantity === 1 ? 1.8 : 2.4" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" :d="quantity === 1 ? TRASH : MINUS" />
      </svg>
    </button>
    <span
      class="font-label w-7 text-center text-base font-bold tabular-nums"
      :class="variant === 'floating' ? 'text-on-surface' : 'text-on-primary-fixed'"
      aria-live="polite"
    >
      {{ quantity }}
    </span>
    <button
      type="button"
      class="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-on-primary transition-colors hover:bg-primary-container"
      :aria-label="`Agregar una unidad de ${label}`"
      @click="emit('increase')"
    >
      <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.4" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" :d="PLUS" />
      </svg>
    </button>
  </div>
</template>
