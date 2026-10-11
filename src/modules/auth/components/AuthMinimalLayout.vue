<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

import ThemeMenu from '@/components/navigation/ThemeMenu.vue'

/**
 * Pantalla de acceso común a clientes y restaurantes: misma estructura y estilo,
 * con pestañas Ingresar / Crear cuenta y un enlace para cambiar de tipo de cuenta.
 */
const props = defineProps<{
  audience: 'customer' | 'restaurant'
  mode: 'login' | 'register'
  title: string
  subtitle?: string
  /** Oculta pestañas y cambio de tipo (por ejemplo, con la sesión ya iniciada). */
  hideSwitches?: boolean
}>()

const route = useRoute()

/** Se conserva ?redirect al cambiar de pestaña. */
const query = computed(() => (typeof route.query.redirect === 'string' ? { redirect: route.query.redirect } : {}))

const routes = computed(() =>
  props.audience === 'customer'
    ? { login: 'diner-auth', register: 'diner-register' }
    : { login: 'login', register: 'register' },
)

const otherAudience = computed(() =>
  props.audience === 'customer'
    ? { label: '¿Tienes un restaurante?', action: 'Entra como dueño', to: { name: props.mode === 'login' ? 'login' : 'register' } }
    : { label: '¿Eres cliente?', action: 'Entra como cliente', to: { name: props.mode === 'login' ? 'diner-auth' : 'diner-register' } },
)
</script>

<template>
  <div class="flex min-h-dvh flex-col bg-background">
    <header class="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
      <RouterLink :to="{ name: 'home' }" class="flex items-center gap-2.5" aria-label="RentaSol, ir al inicio">
        <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-on-primary" aria-hidden="true">
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
            />
          </svg>
        </span>
        <span class="font-headline text-lg font-semibold text-on-surface">RentaSol</span>
      </RouterLink>
      <ThemeMenu />
    </header>

    <main class="flex flex-1 items-start justify-center px-4 pt-6 pb-16 sm:items-center sm:pt-0">
      <div class="w-full max-w-sm space-y-6">
        <div class="space-y-2 text-center">
          <span
            class="font-label inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
            :class="audience === 'customer' ? 'bg-primary-fixed text-on-primary-fixed' : 'bg-tertiary-fixed text-on-tertiary-container'"
          >
            {{ audience === 'customer' ? 'Cliente' : 'Restaurante' }}
          </span>
          <h1 class="font-headline text-3xl font-semibold tracking-tight text-on-surface">{{ title }}</h1>
          <p v-if="subtitle" class="text-sm text-on-surface-variant">{{ subtitle }}</p>
        </div>

        <nav v-if="!hideSwitches" class="grid grid-cols-2 gap-1 rounded-xl bg-surface-container p-1" aria-label="Ingresar o crear cuenta">
          <RouterLink
            v-for="tab in [
              { key: 'login', label: 'Ingresar' },
              { key: 'register', label: 'Crear cuenta' },
            ] as const"
            :key="tab.key"
            :to="{ name: routes[tab.key], query }"
            replace
            class="font-label flex min-h-10 items-center justify-center rounded-lg text-sm font-semibold transition-colors"
            :class="mode === tab.key ? 'bg-surface-container-lowest text-on-surface shadow-sm' : 'text-on-surface-variant hover:text-on-surface'"
            :aria-current="mode === tab.key ? 'page' : undefined"
          >
            {{ tab.label }}
          </RouterLink>
        </nav>

        <slot />

        <p v-if="!hideSwitches" class="border-t border-outline-variant/50 pt-5 text-center text-sm text-on-surface-variant">
          {{ otherAudience.label }}
          <RouterLink :to="otherAudience.to" class="font-semibold text-primary hover:underline">{{ otherAudience.action }}</RouterLink>
        </p>

        <slot name="footer" />
      </div>
    </main>
  </div>
</template>
