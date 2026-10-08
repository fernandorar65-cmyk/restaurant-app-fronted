<script setup lang="ts">
import ConfirmHost from '@/components/feedback/ConfirmHost.vue'
import ToastHost from '@/components/feedback/ToastHost.vue'
import { useThemeStore } from '@/stores/theme'

// Aplica el tema guardado (claro, oscuro o el del sistema) desde el arranque.
useThemeStore()
</script>

<template>
  <RouterView />
  <ToastHost />
  <ConfirmHost />
</template>
