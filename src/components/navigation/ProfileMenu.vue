<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useId, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import { useDinerStore } from '@/stores/diner'
import { useSessionStore } from '@/stores/session'
import { useSiteActivityStore } from '@/stores/site-activity'
import { getInitials } from '@/utils/string'

const diner = useDinerStore()
const session = useSessionStore()
const activity = useSiteActivityStore()
const route = useRoute()
const router = useRouter()
const menuId = useId()

const isOpen = ref(false)
const root = ref<HTMLElement | null>(null)

/** Quién tiene sesión en este navegador: un cliente, alguien del personal, ambos o nadie. */
const initials = computed(() => {
  const name = diner.customer?.name ?? (session.isAuthenticated ? session.user?.name : null)
  return name ? getInitials(name) : null
})

function close(): void {
  isOpen.value = false
}

/** Cierra la sesión del cliente. Si estaba en una pantalla de su cuenta, vuelve al inicio. */
async function logoutCustomer(): Promise<void> {
  close()
  diner.setCustomer(null)

  if (route.name === 'diner-profile' || route.name === 'diner-visits') {
    await router.push({ name: 'home' })
  }
}

/** Cierra la sesión del dueño / personal en este navegador. */
function logoutStaff(): void {
  close()
  activity.watchSite(null)
  session.clearAuth()
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
  <div ref="root" class="relative">
    <button
      type="button"
      class="flex h-10 w-10 items-center justify-center rounded-full transition-colors"
      :class="initials ? 'bg-primary text-on-primary hover:bg-primary-container' : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'"
      aria-label="Perfil"
      aria-haspopup="menu"
      :aria-expanded="isOpen"
      :aria-controls="menuId"
      @click="isOpen = !isOpen"
    >
      <span v-if="initials" class="font-label text-xs font-bold">{{ initials }}</span>
      <svg v-else class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
        />
      </svg>
    </button>

    <div
      v-if="isOpen"
      :id="menuId"
      role="menu"
      aria-label="Perfil"
      class="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-2xl bg-surface-container-lowest py-2 shadow-xl ring-1 ring-outline-variant/50"
    >
      <!-- Cliente -->
      <p class="font-label px-4 pt-1 pb-1.5 text-xs font-semibold tracking-wider text-outline uppercase">Cliente</p>
      <template v-if="diner.customer">
        <p class="truncate px-4 pb-1 text-sm text-on-surface-variant">{{ diner.customer.name }}</p>
        <RouterLink
          :to="{ name: 'diner-profile' }"
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
        <RouterLink
          :to="{ name: 'diner-visits' }"
          role="menuitem"
          class="flex min-h-11 items-center gap-3 px-4 text-sm text-on-surface hover:bg-surface-container-low"
          @click="close"
        >
          <svg class="h-5 w-5 shrink-0 text-on-surface-variant" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          Mis visitas
        </RouterLink>
        <button
          type="button"
          role="menuitem"
          class="flex min-h-11 w-full items-center gap-3 px-4 text-left text-sm text-error hover:bg-error-container/50"
          @click="logoutCustomer"
        >
          <svg class="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
          </svg>
          Cerrar sesión
        </button>
      </template>
      <RouterLink
        v-else
        :to="{ name: 'diner-auth' }"
        role="menuitem"
        class="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-container-low"
        @click="close"
      >
        <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-fixed text-on-primary-fixed" aria-hidden="true">
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
            />
          </svg>
        </span>
        <span class="min-w-0">
          <span class="block text-sm font-semibold text-on-surface">Soy cliente</span>
          <span class="block text-xs text-on-surface-variant">Inicia sesión o crea tu cuenta</span>
        </span>
      </RouterLink>

      <div class="my-2 border-t border-outline-variant/50" />

      <!-- Dueño / personal del restaurante -->
      <p class="font-label px-4 pt-1 pb-1.5 text-xs font-semibold tracking-wider text-outline uppercase">Restaurante</p>
      <RouterLink
        :to="session.isAuthenticated ? { name: 'staff-profile' } : { name: 'login' }"
        role="menuitem"
        class="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-container-low"
        @click="close"
      >
        <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tertiary-fixed text-on-tertiary-container" aria-hidden="true">
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z"
            />
          </svg>
        </span>
        <span class="min-w-0">
          <span class="block text-sm font-semibold text-on-surface">
            {{ session.isAuthenticated ? 'Perfil del restaurante' : 'Soy dueño de restaurante' }}
          </span>
          <span class="block truncate text-xs text-on-surface-variant">
            {{ session.isAuthenticated ? session.user?.name : 'Acceso para dueños y personal' }}
          </span>
        </span>
      </RouterLink>
      <button
        v-if="session.isAuthenticated"
        type="button"
        role="menuitem"
        class="flex min-h-11 w-full items-center gap-3 px-4 text-left text-sm text-error hover:bg-error-container/50"
        @click="logoutStaff"
      >
        <svg class="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
        </svg>
        Cerrar sesión del restaurante
      </button>
    </div>
  </div>
</template>
