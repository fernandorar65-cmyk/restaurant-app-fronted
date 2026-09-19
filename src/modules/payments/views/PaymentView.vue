<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import PageHeader from '@/components/base/PageHeader.vue'
import { usePageTitle } from '@/composables/usePageTitle'

const route = useRoute()
const orderId = computed(() => route.params.orderId)

usePageTitle('Pago')
</script>

<template>
  <PageHeader
    title="Pago"
    description="Una orden podrá liquidarse con uno o varios pagos cuando el módulo de payments esté conectado."
  >
    <p class="text-sm text-stone-500">Pedido: {{ orderId }}</p>
  </PageHeader>
</template>
