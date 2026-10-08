<script setup lang="ts">
defineProps<{
  quantity: number
  label: string
}>()

const emit = defineEmits<{
  increase: []
  decrease: []
}>()
</script>

<template>
  <button
    v-if="quantity === 0"
    type="button"
    class="font-label inline-flex min-h-11 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary-container"
    :aria-label="`Agregar ${label}`"
    @click="emit('increase')"
  >
    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.4" aria-hidden="true">
      <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
    Agregar
  </button>
  <div v-else class="inline-flex items-center rounded-full bg-primary-fixed p-0.5">
    <button
      type="button"
      class="flex h-11 w-11 items-center justify-center rounded-full text-on-primary-fixed transition-colors hover:bg-surface-container-lowest/60"
      :aria-label="`Quitar una unidad de ${label}`"
      @click="emit('decrease')"
    >
      <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.4" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14" />
      </svg>
    </button>
    <span class="font-label w-7 text-center text-base font-bold text-on-primary-fixed tabular-nums" aria-live="polite">{{ quantity }}</span>
    <button
      type="button"
      class="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-on-primary transition-colors hover:bg-primary-container"
      :aria-label="`Agregar una unidad de ${label}`"
      @click="emit('increase')"
    >
      <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.4" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
    </button>
  </div>
</template>
