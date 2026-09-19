<script setup lang="ts">
import PageHeader from '@/components/base/PageHeader.vue'
import { usePageTitle } from '@/composables/usePageTitle'

usePageTitle('Ingresar')
</script>

<template>
  <PageHeader
    title="Ingresar"
    description="El acceso de personal y clientes autenticados se conectará al módulo de auth."
  />
</template>
