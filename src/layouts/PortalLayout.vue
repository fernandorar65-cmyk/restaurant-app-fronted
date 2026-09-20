<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import PortalFooter from '@/components/navigation/PortalFooter.vue'
import PortalHeader from '@/components/navigation/PortalHeader.vue'
import PortalSidebar from '@/components/navigation/PortalSidebar.vue'

const route = useRoute()
const isSidebarOpen = ref(false)

function openSidebar(): void {
  isSidebarOpen.value = true
}

function closeSidebar(): void {
  isSidebarOpen.value = false
}

watch(
  () => route.fullPath,
  () => {
    isSidebarOpen.value = false
  },
)
</script>

<template>
  <div class="flex min-h-screen bg-[#f8f9fa] text-on-surface antialiased">
    <PortalSidebar :open="isSidebarOpen" @close="closeSidebar" />
    <div class="flex min-w-0 flex-1 flex-col">
      <PortalHeader @open-menu="openSidebar" />
      <main class="w-full flex-1 pb-16">
        <RouterView />
      </main>
      <PortalFooter />
    </div>
  </div>
</template>
