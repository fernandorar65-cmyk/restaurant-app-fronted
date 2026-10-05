<script setup lang="ts">
import { RouterLink } from 'vue-router'

import type { RestaurantSite } from '@/modules/restaurants/types'
import { useSessionStore } from '@/stores/session'

defineProps<{
  restaurant: RestaurantSite
  section: string
  title: string
  description?: string
}>()

const session = useSessionStore()
</script>

<template>
  <div class="space-y-4">
    <nav
      class="font-label flex flex-wrap items-center gap-2 text-[11px] font-semibold tracking-widest text-on-surface-variant uppercase"
      aria-label="Migas"
    >
      <template v-if="session.hasSiteAccess && (session.user?.restaurantIds.length ?? 0) !== 1">
        <RouterLink class="transition-colors hover:text-primary" :to="{ name: 'dashboard' }">Sedes</RouterLink>
        <span class="text-outline-variant">/</span>
      </template>
      <span>{{ restaurant.name }} ({{ restaurant.city }})</span>
      <span class="text-outline-variant">/</span>
      <span class="font-bold text-primary">{{ section }}</span>
    </nav>

    <div class="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
      <div>
        <h1 class="font-headline text-2xl font-semibold tracking-tight text-on-surface lg:text-3xl">{{ title }}</h1>
        <p v-if="description" class="mt-1 text-sm text-on-surface-variant">{{ description }}</p>
      </div>
      <div v-if="$slots.actions" class="flex flex-wrap items-center gap-2">
        <slot name="actions" />
      </div>
    </div>
  </div>
</template>
