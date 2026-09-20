<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

const props = defineProps<{
  restaurantId: string
}>()

const route = useRoute()

const isSala = computed(() => route.name === 'site-dashboard')
const isOrders = computed(() => route.name === 'site-orders' || route.name === 'site-order-detail')

const linkClass = 'font-label rounded-lg px-3.5 py-1.5 text-xs font-semibold tracking-wide uppercase transition-colors'
const idleClass = 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
const activeClass = 'bg-primary-container text-on-primary-container'
</script>

<template>
  <nav class="flex items-center gap-1 overflow-x-auto" aria-label="Secciones de la sede">
    <RouterLink
      :class="[linkClass, isSala ? activeClass : idleClass]"
      :to="{ name: 'site-dashboard', params: { restaurantId: props.restaurantId } }"
    >
      Sala y equipo
    </RouterLink>
    <RouterLink
      :class="[linkClass, isOrders ? activeClass : idleClass]"
      :to="{ name: 'site-orders', params: { restaurantId: props.restaurantId } }"
    >
      Pedidos
    </RouterLink>
  </nav>
</template>
