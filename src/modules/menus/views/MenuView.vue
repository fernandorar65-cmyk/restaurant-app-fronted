<script setup lang="ts">
import PageHeader from '@/components/base/PageHeader.vue'
import { usePageTitle } from '@/composables/usePageTitle'

usePageTitle('Menú')
</script>

<template>
  <PageHeader
    title="Menú"
    description="Aquí se mostrarán categorías y productos del restaurante seleccionado."
  />
</template>
