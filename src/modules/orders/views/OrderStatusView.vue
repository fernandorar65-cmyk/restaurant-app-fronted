<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import PageHeader from '@/components/base/PageHeader.vue'
import { usePageTitle } from '@/composables/usePageTitle'

const route = useRoute()
const orderId = computed(() => route.params.orderId)

usePageTitle('Pedido')
</script>

<template>
  <PageHeader
    title="Estado del pedido"
    description="El cliente podrá consultar el estado de su orden. El contrato de estados vendrá del backend."
  >
    <p class="text-sm text-stone-500">Pedido: {{ orderId }}</p>
  </PageHeader>
</template>
