<script setup lang="ts">
import PageHeader from '@/components/base/PageHeader.vue'
import { usePageTitle } from '@/composables/usePageTitle'

usePageTitle('Página no encontrada')
</script>

<template>
  <PageHeader
    title="Página no encontrada"
    description="La ruta que intentas abrir no existe en Restaurant CMR."
  />
</template>
