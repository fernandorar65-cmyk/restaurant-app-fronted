<script setup lang="ts">
import PageHeader from '@/components/base/PageHeader.vue'
import { usePageTitle } from '@/composables/usePageTitle'

usePageTitle('Restaurantes')
</script>

<template>
  <PageHeader
    title="Selecciona un restaurante"
    description="El cliente podrá consultar el menú de un local. Esta vista espera el contrato de la API."
  />
</template>
