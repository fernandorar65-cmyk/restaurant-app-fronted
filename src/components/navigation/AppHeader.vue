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
  <header class="border-b border-stone-200 bg-white">
    <div class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
      <RouterLink
        :to="variant === 'admin' ? { name: 'dashboard' } : { name: 'home' }"
        class="text-lg font-semibold text-stone-900"
      >
        Restaurant CMR
      </RouterLink>

      <nav class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm" aria-label="Principal">
        <template v-if="variant === 'customer'">
          <RouterLink class="text-stone-600 hover:text-stone-900" :to="{ name: 'menu' }">Carta</RouterLink>
          <RouterLink v-if="diner.isReadyToOrder" class="text-stone-600 hover:text-stone-900" :to="{ name: 'cart' }">
            Carrito<span v-if="cart.itemCount > 0" class="ml-1 rounded-full bg-primary px-1.5 text-[11px] font-bold text-on-primary">{{ cart.itemCount }}</span>
          </RouterLink>
          <RouterLink
            v-if="diner.attentionId"
            class="text-stone-600 hover:text-stone-900"
            :to="{ name: 'order-status', params: { attentionId: diner.attentionId } }"
          >
            Mi pedido
          </RouterLink>
          <RouterLink v-if="diner.customer" class="text-stone-700 hover:text-stone-900" :to="{ name: 'diner-auth' }">
            {{ diner.customer.name }}
          </RouterLink>
          <RouterLink v-else class="text-stone-600 hover:text-stone-900" :to="{ name: 'diner-auth' }">Ingresar</RouterLink>
          <RouterLink class="text-xs text-stone-400 hover:text-stone-700" :to="{ name: 'login' }">Acceso personal</RouterLink>
        </template>
        <template v-else>
          <RouterLink class="text-stone-600 hover:text-stone-900" :to="{ name: 'dashboard' }">Dashboard</RouterLink>
          <RouterLink class="text-stone-600 hover:text-stone-900" :to="{ name: 'home' }">Vista cliente</RouterLink>
          <template v-if="session.isAuthenticated">
            <span class="text-stone-700">{{ session.user?.name }}</span>
            <button type="button" class="text-stone-600 hover:text-stone-900" @click="logout">Salir</button>
          </template>
        </template>
      </nav>
    </div>
  </header>
</template>
