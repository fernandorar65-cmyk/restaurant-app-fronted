<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

import { fetchRestaurantById } from '@/modules/restaurants/api'
import { useSessionStore } from '@/stores/session'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const route = useRoute()
const session = useSessionStore()
const siteName = ref<string | null>(null)

const restaurantId = computed(() => {
  const param = route.params.restaurantId
  if (typeof param === 'string') {
    return param
  }

  return session.restaurantId
})

const isSedes = computed(() => route.name === 'dashboard')
const isSala = computed(() => route.name === 'site-dashboard')
const isOrders = computed(() => route.name === 'site-orders' || route.name === 'site-order-detail')

const itemClass =
  'font-label flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors'
const idleClass = 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
const activeClass = 'bg-primary-container text-on-primary-container'

async function loadSiteName(): Promise<void> {
  const id = restaurantId.value
  if (!id) {
    siteName.value = null
    return
  }

  const site = await fetchRestaurantById(id)
  siteName.value = site?.name ?? null
}

watch(restaurantId, () => {
  void loadSiteName()
})

onMounted(() => {
  void loadSiteName()
})
</script>

<template>
  <div class="lg:w-64 lg:shrink-0 lg:self-stretch">
    <button
      v-if="open"
      type="button"
      class="fixed inset-0 top-16 z-30 bg-on-surface/40 lg:hidden"
      aria-label="Cerrar menú"
      @click="emit('close')"
    />

    <aside
      class="fixed top-16 bottom-0 left-0 z-40 flex w-64 flex-col border-r border-outline-variant/60 bg-surface-container-lowest shadow-sm transition-transform duration-200 lg:static lg:top-auto lg:z-0 lg:h-auto lg:min-h-full lg:translate-x-0 lg:shadow-none"
      :class="open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'"
      aria-label="Navegación del portal"
    >
      <nav class="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-5">
        <div class="space-y-1">
          <p class="font-label px-3 pb-1 text-[10px] font-bold tracking-widest text-on-surface-variant uppercase">
            Cadena
          </p>
          <RouterLink :class="[itemClass, isSedes ? activeClass : idleClass]" :to="{ name: 'dashboard' }">
            <svg class="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21"
              />
            </svg>
            Sedes
          </RouterLink>
        </div>

        <div v-if="restaurantId" class="space-y-1">
          <p class="font-label px-3 pb-1 text-[10px] font-bold tracking-widest text-on-surface-variant uppercase">
            {{ siteName ?? 'Sede' }}
          </p>
          <RouterLink
            :class="[itemClass, isSala ? activeClass : idleClass]"
            :to="{ name: 'site-dashboard', params: { restaurantId } }"
          >
            <svg class="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z"
              />
            </svg>
            Sala y equipo
          </RouterLink>
          <RouterLink
            :class="[itemClass, isOrders ? activeClass : idleClass]"
            :to="{ name: 'site-orders', params: { restaurantId } }"
          >
            <svg class="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18A2.25 2.25 0 0 0 20.25 16.5V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z"
              />
            </svg>
            Pedidos
          </RouterLink>
        </div>
      </nav>
    </aside>
  </div>
</template>
