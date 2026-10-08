<script setup lang="ts">
import { RouterLink, useRouter } from 'vue-router'

import { useCartStore } from '@/stores/cart'
import { useDinerStore } from '@/stores/diner'
import { useSessionStore } from '@/stores/session'

const { variant } = defineProps<{
  variant: 'customer' | 'admin'
}>()

const session = useSessionStore()
const diner = useDinerStore()
const cart = useCartStore()
const router = useRouter()

async function logout(): Promise<void> {
  session.clearAuth()
  await router.push({ name: 'login' })
}
</script>

<template>
  <header class="border-b border-outline-variant/60 bg-surface-container-lowest">
    <div class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
      <RouterLink
        :to="variant === 'admin' ? { name: 'dashboard' } : { name: 'home' }"
        class="text-lg font-semibold text-on-surface"
      >
        Restaurant CMR
      </RouterLink>

      <nav class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm" aria-label="Principal">
        <template v-if="variant === 'customer'">
          <RouterLink class="text-on-surface-variant hover:text-on-surface" :to="{ name: 'home' }">Carta</RouterLink>
          <RouterLink v-if="diner.isReadyToOrder" class="text-on-surface-variant hover:text-on-surface" :to="{ name: 'cart' }">
            Carrito<span v-if="cart.itemCount > 0" class="ml-1 rounded-full bg-primary px-1.5 text-xs font-bold text-on-primary">{{ cart.itemCount }}</span>
          </RouterLink>
          <RouterLink
            v-if="diner.attentionId"
            class="text-on-surface-variant hover:text-on-surface"
            :to="{ name: 'order-status', params: { attentionId: diner.attentionId } }"
          >
            Mi pedido
          </RouterLink>
          <RouterLink v-if="diner.customer" class="text-on-surface-variant hover:text-on-surface" :to="{ name: 'diner-auth' }">
            {{ diner.customer.name }}
          </RouterLink>
          <RouterLink v-else class="text-on-surface-variant hover:text-on-surface" :to="{ name: 'diner-auth' }">Ingresar</RouterLink>
          <RouterLink class="text-xs text-outline hover:text-on-surface" :to="{ name: 'login' }">Acceso personal</RouterLink>
        </template>
        <template v-else>
          <RouterLink class="text-on-surface-variant hover:text-on-surface" :to="{ name: 'dashboard' }">Dashboard</RouterLink>
          <RouterLink class="text-on-surface-variant hover:text-on-surface" :to="{ name: 'home' }">Vista cliente</RouterLink>
          <template v-if="session.isAuthenticated">
            <span class="text-on-surface-variant">{{ session.user?.name }}</span>
            <button type="button" class="text-on-surface-variant hover:text-on-surface" @click="logout">Salir</button>
          </template>
        </template>
      </nav>
    </div>
  </header>
</template>
