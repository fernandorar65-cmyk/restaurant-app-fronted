<script setup lang="ts">
import PortalFooter from '@/components/navigation/PortalFooter.vue'
import PortalHeader from '@/components/navigation/PortalHeader.vue'
</script>

<template>
  <div class="flex min-h-screen flex-col bg-[#f8f9fa] text-on-surface antialiased">
    <PortalHeader />
    <main class="w-full flex-1 pb-16">
      <RouterView />
    </main>
    <PortalFooter />
  </div>
</template>
