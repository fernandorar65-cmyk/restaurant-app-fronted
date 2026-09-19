<script setup lang="ts">
import PageHeader from '@/components/base/PageHeader.vue'
import { usePageTitle } from '@/composables/usePageTitle'

usePageTitle('Carrito')
</script>

<template>
  <PageHeader
    title="Carrito"
    description="Los productos seleccionados se consolidarán aquí antes de crear el pedido."
  />
</template>
