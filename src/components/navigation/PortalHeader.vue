<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'
import { computed, onMounted, ref, watch } from 'vue'

import { landingRouteFor } from '@/app/router/landing'
import StaffAccountMenu from '@/components/navigation/StaffAccountMenu.vue'
import ThemeMenu from '@/components/navigation/ThemeMenu.vue'
import { fetchRestaurantById } from '@/modules/restaurants/api'
import { useSessionStore } from '@/stores/session'

const session = useSessionStore()
const route = useRoute()
const currentSiteName = ref<string | null>(null)
const homeRoute = computed(() => landingRouteFor(session.user))
const canSwitchSite = computed(() => session.hasSiteAccess && (session.user?.restaurantIds.length ?? 0) !== 1)

const emit = defineEmits<{
  openMenu: []
}>()

async function loadCurrentSite(): Promise<void> {
  const restaurantId = route.params.restaurantId
  const id = typeof restaurantId === 'string' ? restaurantId : null

  if (!id) {
    currentSiteName.value = null
    return
  }

  const site = await fetchRestaurantById(id)
  currentSiteName.value = site?.name ?? null
}

watch(
  () => route.params.restaurantId,
  () => {
    void loadCurrentSite()
  },
)

onMounted(() => {
  void loadCurrentSite()
})
</script>

<template>
  <header class="sticky top-0 z-50 w-full border-b border-outline-variant/60 bg-surface/85 shadow-[0_1px_8px_rgba(0,0,0,0.04)] backdrop-blur-xl">
    <div class="flex h-16 items-center justify-between gap-4 px-4 lg:px-8">
      <div class="flex items-center gap-3 sm:gap-5">
        <button
          type="button"
          class="touch-target flex items-center justify-center rounded-xl text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface lg:hidden"
          aria-label="Abrir menú"
          @click="emit('openMenu')"
        >
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
        <RouterLink :to="homeRoute" class="flex items-center gap-3">
          <div
            class="flex h-9 w-9 items-center justify-center rounded bg-primary text-on-primary shadow-sm ring-1 ring-blue-700/20"
            aria-hidden="true"
          >
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
              />
            </svg>
          </div>
          <span class="flex flex-col">
            <span class="font-headline text-[17px] leading-none font-semibold tracking-tight text-on-surface">
              Restaurant-CMR
            </span>
            <span class="mt-0.5 hidden text-xs text-on-surface-variant sm:block">Portal del restaurante</span>
          </span>
        </RouterLink>

        <template v-if="currentSiteName">
          <div class="hidden h-6 w-px bg-surface-container-highest md:block" />
          <component
            :is="canSwitchSite ? RouterLink : 'span'"
            :to="canSwitchSite ? { name: 'dashboard' } : undefined"
            class="hidden min-h-10 items-center gap-2 rounded-xl bg-surface-container-low px-3 md:flex"
            :class="canSwitchSite ? 'transition-colors hover:bg-surface-container' : ''"
          >
            <span class="h-2 w-2 rounded-full bg-success" aria-hidden="true" />
            <span class="text-sm font-semibold text-on-surface">{{ currentSiteName }}</span>
            <span v-if="canSwitchSite" class="text-sm text-on-surface-variant">· Cambiar</span>
          </component>
        </template>
      </div>

      <div class="flex items-center gap-3">
        <ThemeMenu />
        <StaffAccountMenu />
      </div>
    </div>
  </header>
</template>
