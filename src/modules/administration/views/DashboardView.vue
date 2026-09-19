<script setup lang="ts">
import PageHeader from '@/components/base/PageHeader.vue'
import { usePageTitle } from '@/composables/usePageTitle'
import { useSessionStore } from '@/stores/session'

usePageTitle('Dashboard')

const session = useSessionStore()
</script>

<template>
  <PageHeader
    title="Dashboard"
    :description="`Hola, ${session.user?.name ?? 'usuario'}. Esta es la vista inicial después de iniciar sesión.`"
  />
</template>
