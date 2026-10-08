<script setup lang="ts">
import type { RestaurantSite } from '@/modules/restaurants/types'

/**
 * Encabezado de las vistas de una sede. La sede ya se muestra en el encabezado
 * del portal y en la barra lateral, así que aquí solo van título, contexto y acciones.
 */
defineProps<{
  restaurant: RestaurantSite
  section: string
  title: string
  description?: string
}>()
</script>

<template>
  <div class="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
    <div class="min-w-0">
      <p class="text-sm font-medium text-on-surface-variant">{{ restaurant.name }} · {{ section }}</p>
      <h1 class="font-headline text-3xl font-semibold tracking-tight text-on-surface">{{ title }}</h1>
      <p v-if="description" class="mt-1 max-w-3xl text-base text-on-surface-variant">{{ description }}</p>
    </div>
    <div v-if="$slots.actions" class="flex flex-wrap items-center gap-2">
      <slot name="actions" />
    </div>
  </div>
</template>
