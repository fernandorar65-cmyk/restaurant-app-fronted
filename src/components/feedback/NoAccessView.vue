<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

import { landingRouteFor } from '@/app/router/landing'
import { usePageTitle } from '@/composables/usePageTitle'
import { useSessionStore } from '@/stores/session'

usePageTitle('Sin acceso')

const route = useRoute()
const session = useSessionStore()

const hasRole = computed(() => (session.user?.permissions.length ?? 0) > 0)

const message = computed(() => {
  if (!hasRole.value) {
    return 'Tu cuenta todavía no tiene un rol asignado. Pide a un administrador que te asigne uno desde Administración → Usuarios.'
  }

  if (route.query.motivo === 'sede') {
    return 'Tu cuenta no tiene acceso a esta sede.'
  }

  return 'Tu rol no tiene permiso para abrir esta sección.'
})
</script>

<template>
  <div class="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
    <span class="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-container text-on-surface-variant" aria-hidden="true">
      <svg class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
        />
      </svg>
    </span>
    <h1 class="font-headline text-2xl font-semibold text-on-surface">Sin acceso</h1>
    <p class="text-sm text-on-surface-variant">{{ message }}</p>
    <p v-if="session.user?.roleName" class="text-xs text-on-surface-variant">Rol actual: {{ session.user.roleName }}</p>
    <RouterLink
      v-if="hasRole"
      class="font-label rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary shadow-sm hover:bg-primary-container"
      :to="landingRouteFor(session.user)"
    >
      Ir a mi inicio
    </RouterLink>
  </div>
</template>
