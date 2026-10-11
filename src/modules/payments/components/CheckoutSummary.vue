<script setup lang="ts">
import { computed } from 'vue'

import { fulfillmentLabel } from '@/modules/payments/checkout'
import { useCartStore } from '@/stores/cart'
import { useCheckoutStore } from '@/stores/checkout'
import { useDinerStore } from '@/stores/diner'
import { formatMoney } from '@/utils/money'

/** Resumen del checkout: sede, cómo se recibe el pedido y total. */
const props = defineProps<{
  total: number
  deliveryFee: number
}>()

const cart = useCartStore()
const diner = useDinerStore()
const checkout = useCheckoutStore()

const fulfillmentDetail = computed(() => {
  switch (checkout.mode) {
    case 'dine-in':
      return `Mesa ${diner.tableCode ?? '—'}`
    case 'pickup':
      return `Llegada ${checkout.pickup.arrivalTime} · ${checkout.pickup.eatIn ? 'Come en el local' : 'Para llevar'}`
    case 'delivery':
      return checkout.delivery.address
    default:
      return '—'
  }
})
</script>

<template>
  <section class="divide-y divide-outline-variant/50 rounded-2xl bg-surface-container-lowest ring-1 ring-outline-variant/40">
    <div class="px-4 py-3">
      <span class="block text-xs text-on-surface-variant">Sede</span>
      <span class="block truncate text-sm font-semibold text-on-surface">{{ diner.restaurantName }}</span>
    </div>
    <div class="flex items-center justify-between gap-3 px-4 py-3">
      <span class="min-w-0">
        <span class="block text-xs text-on-surface-variant">{{ checkout.mode ? fulfillmentLabel[checkout.mode] : 'Entrega' }}</span>
        <span class="block truncate text-sm font-semibold text-on-surface">{{ fulfillmentDetail }}</span>
      </span>
      <slot />
    </div>
    <dl class="space-y-1 px-4 py-3 text-sm">
      <div class="flex justify-between text-on-surface-variant">
        <dt>{{ cart.itemCount }} {{ cart.itemCount === 1 ? 'producto' : 'productos' }}</dt>
        <dd>{{ formatMoney(cart.subtotal, diner.currency) }}</dd>
      </div>
      <div v-if="props.deliveryFee > 0" class="flex justify-between text-on-surface-variant">
        <dt>Envío</dt>
        <dd>{{ formatMoney(props.deliveryFee, diner.currency) }}</dd>
      </div>
      <div class="flex items-baseline justify-between pt-1">
        <dt class="font-semibold text-on-surface">Total</dt>
        <dd class="font-headline text-2xl font-semibold text-on-surface">{{ formatMoney(props.total, diner.currency) }}</dd>
      </div>
    </dl>
  </section>
</template>
