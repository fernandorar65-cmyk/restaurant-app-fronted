<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

import { useDinerStore } from '@/stores/diner'

const diner = useDinerStore()
const route = useRoute()

/* En el inicio el comensal todavía está eligiendo sede: se muestra la marca, no la última sede. */
const isHome = computed(() => route.name === 'home')
const title = computed(() => (isHome.value ? null : diner.restaurantName) ?? 'RentaSol')
</script>

<template>
  <header class="sticky top-0 z-30 border-b border-outline-variant/50 bg-surface/90 backdrop-blur-xl">
    <div class="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4">
      <RouterLink :to="{ name: 'home' }" class="flex min-w-0 items-center gap-2.5" aria-label="Inicio">
        <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-on-primary" aria-hidden="true">
          <svg class="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
            />
          </svg>
        </span>
        <span class="min-w-0 leading-tight">
          <span class="font-headline block truncate text-base font-semibold text-on-surface">
            {{ title }}
          </span>
          <span v-if="isHome || !diner.restaurantId" class="block text-xs text-on-surface-variant">Pide desde tu mesa</span>
        </span>
      </RouterLink>
      <span
        v-if="diner.tableNumber && !isHome"
        class="font-label ml-auto shrink-0 rounded-full bg-primary-fixed px-3 py-1 text-xs font-semibold text-on-primary-fixed"
      >
        Mesa {{ diner.tableNumber }}
      </span>
      <span
        v-else-if="diner.restaurantId && !isHome"
        class="font-label ml-auto shrink-0 rounded-full bg-surface-container px-3 py-1 text-xs font-semibold text-on-surface-variant"
      >
        Solo consulta
      </span>
    </div>
  </header>
</template>
