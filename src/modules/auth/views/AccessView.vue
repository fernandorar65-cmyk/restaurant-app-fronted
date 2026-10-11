<script setup lang="ts">
import { computed, watchEffect } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import type { RouteLocationRaw } from 'vue-router'

import { usePageTitle } from '@/composables/usePageTitle'

/**
 * Punto de entrada único para iniciar sesión o registrarse: el usuario elige si es
 * cliente o dueño de restaurante y va al formulario que corresponde.
 */
const route = useRoute()

const isRegister = computed(() => route.query.modo === 'registro')

// Se actualiza al alternar entre "Inicia sesión" y "Regístrate" sin salir de la pantalla.
watchEffect(() => usePageTitle(isRegister.value ? 'Crear cuenta' : 'Iniciar sesión'))

const options = computed<Array<{ key: string; title: string; description: string; perks: string[]; to: RouteLocationRaw; tone: string; icon: string }>>(() => [
  {
    key: 'customer',
    title: 'Soy cliente',
    description: isRegister.value ? 'Crea tu cuenta para pedir más rápido.' : 'Entra a tu cuenta de cliente.',
    perks: ['Guarda tus visitas y pedidos', 'Tus preferencias y alergias', 'Paga y sigue tu pedido'],
    to: { name: isRegister.value ? 'diner-register' : 'diner-auth' },
    tone: 'bg-primary-fixed text-on-primary-fixed',
    icon: 'M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z',
  },
  {
    key: 'restaurant',
    title: 'Soy dueño de restaurante',
    description: isRegister.value ? 'Registra tu restaurante en RentaSol.' : 'Entra al portal de tu restaurante.',
    perks: ['Gestiona tu carta y precios', 'Recibe pedidos y cobra', 'Administra sedes y personal'],
    to: { name: isRegister.value ? 'register' : 'login' },
    tone: 'bg-tertiary-fixed text-on-tertiary-container',
    icon: 'M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z',
  },
])
</script>

<template>
  <div class="mx-auto max-w-2xl space-y-6 py-4">
    <div class="space-y-1 text-center">
      <h1 class="font-headline text-3xl font-semibold text-on-surface">{{ isRegister ? 'Crea tu cuenta' : 'Inicia sesión' }}</h1>
      <p class="text-sm text-on-surface-variant">¿Cómo quieres {{ isRegister ? 'registrarte' : 'entrar' }}?</p>
    </div>

    <div class="grid gap-3 sm:grid-cols-2">
      <RouterLink
        v-for="option in options"
        :key="option.key"
        :to="option.to"
        class="group flex flex-col gap-4 rounded-2xl bg-surface-container-lowest p-5 ring-1 ring-outline-variant/40 transition hover:ring-2 hover:ring-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <div class="flex items-center gap-3">
          <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" :class="option.tone" aria-hidden="true">
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" :d="option.icon" />
            </svg>
          </span>
          <span class="min-w-0 flex-1">
            <span class="block font-semibold text-on-surface">{{ option.title }}</span>
            <span class="block text-sm text-on-surface-variant">{{ option.description }}</span>
          </span>
          <span class="text-outline transition-transform group-hover:translate-x-0.5" aria-hidden="true">→</span>
        </div>
        <ul class="space-y-1.5 border-t border-outline-variant/50 pt-3">
          <li v-for="perk in option.perks" :key="perk" class="flex items-center gap-2 text-sm text-on-surface-variant">
            <svg class="h-4 w-4 shrink-0 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.4" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
            {{ perk }}
          </li>
        </ul>
      </RouterLink>
    </div>

    <p class="text-center text-sm text-on-surface-variant">
      <template v-if="isRegister">
        ¿Ya tienes cuenta?
        <RouterLink class="font-semibold text-primary hover:underline" :to="{ name: 'access' }">Inicia sesión</RouterLink>
      </template>
      <template v-else>
        ¿No tienes cuenta?
        <RouterLink class="font-semibold text-primary hover:underline" :to="{ name: 'access', query: { modo: 'registro' } }">Regístrate</RouterLink>
      </template>
    </p>
  </div>
</template>
