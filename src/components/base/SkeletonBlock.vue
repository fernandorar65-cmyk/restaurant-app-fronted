<script setup lang="ts">
/** Esqueleto de carga: tarjetas grises que anticipan el contenido. */
withDefaults(
  defineProps<{
    rows?: number
    variant?: 'cards' | 'list' | 'page'
  }>(),
  { rows: 3, variant: 'cards' },
)
</script>

<template>
  <div role="status" aria-label="Cargando" class="space-y-4">
    <template v-if="variant === 'page'">
      <div class="skeleton h-8 w-64" />
      <div class="skeleton h-4 w-96 max-w-full" />
      <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div v-for="index in 4" :key="index" class="skeleton h-28" />
      </div>
    </template>
    <div :class="variant === 'list' ? 'space-y-3' : 'grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3'">
      <div v-for="index in rows" :key="index" class="skeleton" :class="variant === 'list' ? 'h-20' : 'h-40'" />
    </div>
    <span class="sr-only">Cargando…</span>
  </div>
</template>
