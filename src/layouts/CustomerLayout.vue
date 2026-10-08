<script setup lang="ts">
import DinerBottomNav from '@/components/navigation/DinerBottomNav.vue'
import DinerTopBar from '@/components/navigation/DinerTopBar.vue'
</script>

<template>
  <div class="flex min-h-dvh flex-col bg-background">
    <DinerTopBar />
    <!-- Espacio inferior para la barra de navegación fija. -->
    <main class="mx-auto w-full max-w-3xl flex-1 px-4 pt-5 pb-28">
      <RouterView />
    </main>
    <DinerBottomNav />
  </div>
</template>
