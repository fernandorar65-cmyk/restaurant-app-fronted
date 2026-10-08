<script setup lang="ts">
import { onBeforeUnmount, ref, useId, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'

import { useSessionStore } from '@/stores/session'
import { useSiteActivityStore } from '@/stores/site-activity'
import { getInitials } from '@/utils/string'

/** Avatar del portal del restaurante: abre "Mi perfil" y "Cerrar sesión". */
const session = useSessionStore()
const activity = useSiteActivityStore()
const router = useRouter()
const menuId = useId()

const isOpen = ref(false)
const root = ref<HTMLElement | null>(null)

function close(): void {
  isOpen.value = false
}

async function logout(): Promise<void> {
  close()
  activity.watchSite(null)
  session.clearAuth()
  await router.push({ name: 'login' })
}

function onPointerDown(event: PointerEvent): void {
  if (root.value && !root.value.contains(event.target as Node)) {
    close()
  }
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    close()
  }
}

watch(isOpen, (open) => {
  if (open) {
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeydown)
  } else {
    document.removeEventListener('pointerdown', onPointerDown)
    document.removeEventListener('keydown', onKeydown)
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onPointerDown)
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div v-if="session.user" ref="root" class="relative">
    <button
      type="button"
      class="flex items-center gap-2.5 rounded-xl py-1 pr-1 pl-1 transition-colors hover:bg-surface-container sm:border-l sm:border-outline-variant sm:pr-2 sm:pl-2"
      aria-label="Mi cuenta"
      aria-haspopup="menu"
      :aria-expanded="isOpen"
      :aria-controls="menuId"
      @click="isOpen = !isOpen"
    >
      <span class="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-on-primary">
        {{ getInitials(session.user.name) }}
      </span>
      <span class="hidden flex-col text-left sm:flex">
        <span class="text-xs leading-tight font-semibold text-on-surface">{{ session.user.name }}</span>
        <span class="font-label text-xs leading-tight text-on-surface-variant">{{ session.user.roleName ?? session.user.email }}</span>
      </span>
      <svg class="hidden h-4 w-4 text-outline sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
      </svg>
    </button>

    <div
      v-if="isOpen"
      :id="menuId"
      role="menu"
      aria-label="Mi cuenta"
      class="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-2xl bg-surface-container-lowest py-2 shadow-xl ring-1 ring-outline-variant/50"
    >
      <div class="px-4 pt-1 pb-2">
        <p class="truncate text-sm font-semibold text-on-surface">{{ session.user.name }}</p>
        <p class="truncate text-xs text-on-surface-variant">{{ session.user.email }}</p>
      </div>
      <div class="my-1 border-t border-outline-variant/50" />
      <RouterLink
        :to="{ name: 'staff-profile' }"
        role="menuitem"
        class="flex min-h-11 items-center gap-3 px-4 text-sm text-on-surface hover:bg-surface-container-low"
        @click="close"
      >
        <svg class="h-5 w-5 shrink-0 text-on-surface-variant" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
          />
        </svg>
        Mi perfil
      </RouterLink>
      <button
        type="button"
        role="menuitem"
        class="flex min-h-11 w-full items-center gap-3 px-4 text-left text-sm text-error hover:bg-error-container/50"
        @click="logout"
      >
        <svg class="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9"
          />
        </svg>
        Cerrar sesión
      </button>
    </div>
  </div>
</template>
