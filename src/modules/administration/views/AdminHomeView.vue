<script setup lang="ts">
import PageHeader from '@/components/base/PageHeader.vue'
import { usePageTitle } from '@/composables/usePageTitle'

usePageTitle('Administración')
</script>

<template>
  <PageHeader
    title="Administración"
    description="El personal administrará restaurantes, mesas, empleados, menús, productos y pedidos según permisos."
  />
</template>
