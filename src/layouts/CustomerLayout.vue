<script setup lang="ts">
import AppHeader from '@/components/navigation/AppHeader.vue'
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <AppHeader variant="customer" />
    <main class="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
      <RouterView />
    </main>
  </div>
</template>
