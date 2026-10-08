<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import { landingRouteFor } from '@/app/router/landing'
import BaseButton from '@/components/base/BaseButton.vue'
import { usePageTitle } from '@/composables/usePageTitle'
import { useSessionStore } from '@/stores/session'

usePageTitle('Página no encontrada')

const route = useRoute()
const router = useRouter()
const session = useSessionStore()

/* El personal vuelve a su inicio según rol; el comensal, a la selección de sede. */
const homeRoute = computed(() => (session.isAuthenticated ? landingRouteFor(session.user) : { name: 'home' }))
const homeLabel = computed(() => (session.isAuthenticated ? 'Ir a mi inicio' : 'Ver restaurantes'))

const canGoBack = computed(() => typeof window !== 'undefined' && Boolean(window.history.state?.back))

function goBack() {
  router.back()
}
</script>

<template>
  <main class="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-6 py-16">
    <!-- Halo decorativo de fondo -->
    <div
      class="pointer-events-none absolute left-1/2 top-1/2 h-[36rem] w-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-fixed opacity-40 blur-3xl"
      aria-hidden="true"
    />

    <section class="relative flex w-full max-w-lg flex-col items-center text-center">
      <!-- 404 con un plato en lugar del cero -->
      <div class="flex items-center gap-2 sm:gap-4" aria-hidden="true">
        <span class="font-headline text-8xl font-semibold leading-none text-on-surface sm:text-9xl">4</span>
        <svg class="h-24 w-24 sm:h-32 sm:w-32" viewBox="0 0 120 120" fill="none">
          <!-- tenedor -->
          <path
            d="M14 22v22m-5-22v14a5 5 0 0 0 10 0V22M14 50v48"
            class="stroke-outline"
            stroke-width="3.5"
            stroke-linecap="round"
          />
          <!-- cuchillo -->
          <path
            d="M106 98V22c-6 4-9 14-9 26 0 5 3 8 9 8"
            class="stroke-outline"
            stroke-width="3.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <!-- plato -->
          <circle cx="60" cy="60" r="34" class="fill-surface-container-lowest stroke-outline-variant" stroke-width="3" />
          <circle cx="60" cy="60" r="22" class="stroke-primary-fixed-dim" stroke-width="3" stroke-dasharray="4 6" />
        </svg>
        <span class="font-headline text-8xl font-semibold leading-none text-on-surface sm:text-9xl">4</span>
      </div>

      <p class="font-label mt-8 text-xs font-semibold uppercase tracking-[0.2em] text-primary">Error 404</p>
      <h1 class="font-headline mt-2 text-3xl font-semibold text-on-surface sm:text-4xl">
        Este plato no está en la carta
      </h1>
      <p class="mt-3 max-w-md text-sm text-on-surface-variant sm:text-base">
        La página que buscas no existe o fue movida. Revisa la dirección o vuelve a un lugar conocido.
      </p>

      <code
        class="mt-5 max-w-full truncate rounded-lg bg-surface-container px-3 py-1.5 font-mono text-xs text-on-surface-variant"
        :title="route.fullPath"
      >
        {{ route.fullPath }}
      </code>

      <div class="mt-8 flex w-full flex-col-reverse gap-3 sm:w-auto sm:flex-row">
        <BaseButton v-if="canGoBack" variant="secondary" size="lg" @click="goBack">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Volver atrás
        </BaseButton>
        <BaseButton variant="primary" size="lg" :to="homeRoute">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="m2.25 12 8.954-8.955a1.126 1.126 0 0 1 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
            />
          </svg>
          {{ homeLabel }}
        </BaseButton>
      </div>

      <p v-if="!session.isAuthenticated" class="mt-6 text-xs text-on-surface-variant">
        ¿Eres parte del personal?
        <RouterLink class="font-semibold text-primary underline-offset-4 hover:underline" :to="{ name: 'login' }">
          Inicia sesión
        </RouterLink>
      </p>
    </section>
  </main>
</template>
