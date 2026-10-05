<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

import { usePageTitle } from '@/composables/usePageTitle'
import { errorMessage, fetchAllOrderedProducts, fetchAttentionsByCustomer } from '@/modules/orders/api'
import { attentionStatusBadgeClass, attentionStatusLabel, isBillableProduct } from '@/modules/orders/order-status-labels'
import type { Attention } from '@/modules/orders/types'
import { fetchRestaurants } from '@/modules/restaurants/api'
import type { RestaurantSite } from '@/modules/restaurants/types'
import { useDinerStore } from '@/stores/diner'
import { formatMoney } from '@/utils/money'
import { formatDateTime } from '@/utils/time'

usePageTitle('Mis visitas')

interface Visit {
  attention: Attention
  restaurant: RestaurantSite | null
  total: number
}

const diner = useDinerStore()
const visits = ref<Visit[]>([])
const isLoading = ref(true)
const loadError = ref<string | null>(null)

async function loadVisits(): Promise<void> {
  const customer = diner.customer

  if (!customer) {
    isLoading.value = false
    return
  }

  try {
    const [attentions, products, restaurants] = await Promise.all([
      fetchAttentionsByCustomer(customer.id),
      fetchAllOrderedProducts(),
      fetchRestaurants(),
    ])

    visits.value = attentions.map((attention) => ({
      attention,
      restaurant: restaurants.find((site) => site.id === attention.restaurantId) ?? null,
      total: products
        .filter((product) => product.attentionId === attention.id && isBillableProduct(product.status))
        .reduce((sum, product) => sum + product.subtotal, 0),
    }))
  } catch (error) {
    loadError.value = errorMessage(error, 'No se pudo cargar tu historial.')
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  void loadVisits()
})
</script>

<template>
  <div class="mx-auto max-w-2xl space-y-5">
    <div>
      <h1 class="font-headline text-2xl font-semibold text-on-surface">Mis visitas</h1>
      <p v-if="diner.customer" class="text-sm text-on-surface-variant">Historial de {{ diner.customer.name }}</p>
    </div>

    <div v-if="!diner.customer" class="space-y-3 rounded-2xl bg-surface-container-lowest p-6 text-center shadow-sm">
      <p class="text-sm text-on-surface-variant">Ingresa con tu cuenta para ver el historial de tus visitas.</p>
      <RouterLink
        class="font-label inline-flex rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-on-primary"
        :to="{ name: 'diner-auth', query: { redirect: '/mis-visitas' } }"
      >
        Ingresar
      </RouterLink>
    </div>

    <p v-else-if="isLoading" class="text-sm text-on-surface-variant">Cargando…</p>
    <p v-else-if="loadError" class="rounded-lg bg-error-container px-3 py-2 text-sm text-on-error-container">{{ loadError }}</p>
    <p v-else-if="visits.length === 0" class="rounded-2xl bg-surface-container-lowest p-6 text-center text-sm text-on-surface-variant shadow-sm">
      Todavía no tienes visitas registradas.
    </p>

    <ul v-else class="space-y-3">
      <li v-for="visit in visits" :key="visit.attention.id">
        <RouterLink
          class="flex items-center justify-between gap-3 rounded-2xl bg-surface-container-lowest p-4 shadow-sm hover:shadow-md"
          :to="{ name: 'order-status', params: { attentionId: visit.attention.id } }"
        >
          <div class="min-w-0">
            <p class="font-headline truncate text-sm font-semibold text-on-surface">
              {{ visit.restaurant?.name ?? 'Restaurante' }} · Mesa {{ visit.attention.tableNumber }}
            </p>
            <p class="text-xs text-on-surface-variant">{{ formatDateTime(visit.attention.openedAt, visit.restaurant?.timezone) }}</p>
          </div>
          <div class="flex shrink-0 flex-col items-end gap-1">
            <span class="text-sm font-semibold text-on-surface">{{ formatMoney(visit.total, visit.restaurant?.currency) }}</span>
            <span class="font-label rounded px-1.5 py-0.5 text-[10px] font-bold uppercase" :class="attentionStatusBadgeClass[visit.attention.status]">
              {{ attentionStatusLabel[visit.attention.status] }}
            </span>
          </div>
        </RouterLink>
      </li>
    </ul>
  </div>
</template>
