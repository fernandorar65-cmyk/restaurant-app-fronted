<script setup lang="ts">
import { RouterLink, useRouter } from 'vue-router'

import { useSessionStore } from '@/stores/session'

const { variant } = defineProps<{
  variant: 'customer' | 'admin'
}>()

const session = useSessionStore()
const router = useRouter()

async function logout(): Promise<void> {
  session.clearAuth()
  await router.push({ name: 'login' })
}
</script>

<template>
  <header class="border-b border-stone-200 bg-white">
    <div class="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
      <RouterLink
        :to="variant === 'admin' ? { name: 'dashboard' } : { name: 'home' }"
        class="text-lg font-semibold text-stone-900"
      >
        Restaurant CMR
      </RouterLink>

      <nav class="flex items-center gap-4 text-sm" aria-label="Principal">
        <template v-if="variant === 'customer'">
          <RouterLink class="text-stone-600 hover:text-stone-900" :to="{ name: 'home' }">
            Restaurantes
          </RouterLink>
          <RouterLink class="text-stone-600 hover:text-stone-900" :to="{ name: 'menu' }">
            Menú
          </RouterLink>
          <RouterLink class="text-stone-600 hover:text-stone-900" :to="{ name: 'cart' }">
            Carrito
          </RouterLink>
          <template v-if="session.isAuthenticated">
            <RouterLink class="text-stone-600 hover:text-stone-900" :to="{ name: 'dashboard' }">
              Dashboard
            </RouterLink>
            <span class="text-stone-700">{{ session.user?.name }}</span>
            <button type="button" class="text-stone-600 hover:text-stone-900" @click="logout">
              Salir
            </button>
          </template>
          <template v-else>
            <RouterLink class="text-stone-600 hover:text-stone-900" :to="{ name: 'login' }">
              Ingresar
            </RouterLink>
            <RouterLink class="text-stone-600 hover:text-stone-900" :to="{ name: 'register' }">
              Crear cuenta
            </RouterLink>
          </template>
        </template>
        <template v-else>
          <RouterLink class="text-stone-600 hover:text-stone-900" :to="{ name: 'dashboard' }">
            Dashboard
          </RouterLink>
          <RouterLink class="text-stone-600 hover:text-stone-900" :to="{ name: 'home' }">
            Vista cliente
          </RouterLink>
          <template v-if="session.isAuthenticated">
            <span class="text-stone-700">{{ session.user?.name }}</span>
            <button type="button" class="text-stone-600 hover:text-stone-900" @click="logout">
              Salir
            </button>
          </template>
        </template>
      </nav>
    </div>
  </header>
</template>
