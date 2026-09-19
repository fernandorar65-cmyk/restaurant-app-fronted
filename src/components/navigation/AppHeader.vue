<script setup lang="ts">
import { RouterLink } from 'vue-router'

const { variant } = defineProps<{
  variant: 'customer' | 'admin'
}>()
</script>

<template>
  <header class="border-b border-stone-200 bg-white">
    <div class="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
      <RouterLink
        :to="variant === 'admin' ? { name: 'admin-home' } : { name: 'home' }"
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
          <RouterLink class="text-stone-600 hover:text-stone-900" :to="{ name: 'login' }">
            Ingresar
          </RouterLink>
        </template>
        <template v-else>
          <RouterLink class="text-stone-600 hover:text-stone-900" :to="{ name: 'admin-home' }">
            Administración
          </RouterLink>
          <RouterLink class="text-stone-600 hover:text-stone-900" :to="{ name: 'home' }">
            Vista cliente
          </RouterLink>
        </template>
      </nav>
    </div>
  </header>
</template>
