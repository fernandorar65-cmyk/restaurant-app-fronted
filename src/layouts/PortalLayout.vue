<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import PortalFooter from '@/components/navigation/PortalFooter.vue'
import PortalHeader from '@/components/navigation/PortalHeader.vue'
import PortalSidebar from '@/components/navigation/PortalSidebar.vue'
import { useSessionStore } from '@/stores/session'
import { useSiteActivityStore } from '@/stores/site-activity'
import { useToastStore } from '@/stores/toast'

const route = useRoute()
const router = useRouter()
const session = useSessionStore()
const activity = useSiteActivityStore()
const toast = useToastStore()
const isSidebarOpen = ref(false)

/** Relee rol y permisos: aplica cambios hechos por un administrador y expulsa cuentas bloqueadas. */
async function syncAccess(): Promise<void> {
  try {
    const stillValid = await session.refreshUser()

    if (!stillValid) {
      activity.watchSite(null)
      toast.show('Tu sesión se cerró', { message: 'La cuenta fue bloqueada o desactivada.', tone: 'error' })
      await router.push({ name: 'login' })
    }
  } catch {
    // Sin conexión: se mantiene la sesión local hasta el próximo intento.
  }
}

onMounted(() => {
  void syncAccess()
})

onUnmounted(() => {
  activity.watchSite(null)
})

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
    void syncAccess()
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
