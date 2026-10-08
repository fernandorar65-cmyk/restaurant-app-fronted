<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

import { useCartStore } from '@/stores/cart'
import { useDinerStore } from '@/stores/diner'

const diner = useDinerStore()
const cart = useCartStore()
const route = useRoute()

/* En el inicio el comensal todavía está eligiendo sede: se muestra la marca, no la última sede. */
const isHome = computed(() => route.name === 'home')
/* El acceso rápido al carrito solo tiene sentido mientras se mira la carta de una sede. */
const isMenu = computed(() => route.name === 'menu')
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
      <RouterLink
        v-if="isMenu"
        :to="{ name: 'cart' }"
        class="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-on-surface transition-colors hover:bg-surface-container"
        :class="{ 'ml-auto': !(diner.tableNumber && !isHome) }"
        :aria-label="cart.itemCount > 0 ? `Ver carrito, ${cart.itemCount} productos` : 'Ver carrito'"
      >
        <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z"
          />
        </svg>
        <span
          v-if="cart.itemCount > 0"
          class="font-label absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[0.6875rem] font-bold text-on-primary ring-2 ring-surface tabular-nums"
        >
          {{ cart.itemCount > 99 ? '99+' : cart.itemCount }}
        </span>
      </RouterLink>
    </div>
  </header>
</template>
