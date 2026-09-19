<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'

import PageHeader from '@/components/base/PageHeader.vue'
import { usePageTitle } from '@/composables/usePageTitle'
import { useSessionStore } from '@/stores/session'

const route = useRoute()
const session = useSessionStore()

const tableId = computed(() => {
  const value = route.params.tableId
  return typeof value === 'string' ? value : null
})

usePageTitle('Mesa')

watch(
  tableId,
  (value) => {
    if (value) {
      session.setTable(value)
    }
  },
  { immediate: true },
)
</script>

<template>
  <PageHeader
    title="Ingreso por mesa"
    description="El QR de una mesa establecerá el contexto de restaurante y mesa cuando exista el contrato de la API."
  >
    <p v-if="tableId" class="text-sm text-stone-500">Mesa: {{ tableId }}</p>
  </PageHeader>
</template>
