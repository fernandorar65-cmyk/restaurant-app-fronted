<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import type { RouteLocationRaw } from 'vue-router'

import { useCartStore } from '@/stores/cart'
import { useDinerStore } from '@/stores/diner'

const route = useRoute()
const diner = useDinerStore()
const cart = useCartStore()

interface NavItem {
  key: string
  label: string
  to: RouteLocationRaw
  activeNames: string[]
  icon: string
  badge?: number
}

const items = computed<NavItem[]>(() => {
  const list: NavItem[] = [
    {
      key: 'menu',
      label: 'Carta',
      to: diner.menuRoute,
      activeNames: ['menu', 'home'],
      icon: 'M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25',
    },
  ]

  if (diner.isReadyToOrder || cart.itemCount > 0) {
    list.push({
      key: 'cart',
      label: 'Carrito',
      to: { name: 'cart' },
      activeNames: ['cart'],
      icon: 'M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007Z',
      badge: cart.itemCount,
    })
  }

  if (diner.attentionId) {
    list.push(
      {
        key: 'order',
        label: 'Mi pedido',
        to: { name: 'order-status', params: { attentionId: diner.attentionId } },
        activeNames: ['order-status'],
        icon: 'M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
      },
      {
        key: 'account',
        label: 'Cuenta',
        to: { name: 'order-account', params: { attentionId: diner.attentionId } },
        activeNames: ['order-account'],
        icon: 'M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0c1.1.128 1.907 1.077 1.907 2.185Z',
      },
    )
  }

  list.push({
    key: 'profile',
    label: diner.customer ? 'Perfil' : 'Ingresar',
    to: { name: 'diner-auth' },
    activeNames: ['diner-auth', 'diner-visits'],
    icon: 'M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z',
  })

  return list
})

function isActive(item: NavItem): boolean {
  return typeof route.name === 'string' && item.activeNames.includes(route.name)
}
</script>

<template>
  <nav
    class="fixed inset-x-0 bottom-0 z-30 border-t border-outline-variant/50 bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl"
    aria-label="Navegación del comensal"
  >
    <ul class="mx-auto flex max-w-3xl">
      <li v-for="item in items" :key="item.key" class="flex-1">
        <RouterLink
          :to="item.to"
          class="relative flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-semibold transition-colors"
          :class="isActive(item) ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'"
          :aria-current="isActive(item) ? 'page' : undefined"
        >
          <span
            class="flex h-8 w-14 items-center justify-center rounded-full transition-colors"
            :class="isActive(item) ? 'bg-primary-fixed' : ''"
          >
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" :d="item.icon" />
            </svg>
          </span>
          {{ item.label }}
          <span
            v-if="item.badge"
            class="absolute top-1.5 left-1/2 ml-2 min-w-5 rounded-full bg-error px-1.5 text-center text-xs leading-5 font-bold text-on-error"
          >
            {{ item.badge }}
          </span>
        </RouterLink>
      </li>
    </ul>
  </nav>
</template>
