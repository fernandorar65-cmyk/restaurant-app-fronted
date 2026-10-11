<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import SkeletonBlock from '@/components/base/SkeletonBlock.vue'
import { usePageTitle } from '@/composables/usePageTitle'
import { paymentMethodLabel } from '@/modules/payments/api'
import { fulfillmentLabel, isCheckoutMethod } from '@/modules/payments/checkout'
import CardPayment from '@/modules/payments/components/methods/CardPayment.vue'
import CashPayment from '@/modules/payments/components/methods/CashPayment.vue'
import TransferPayment from '@/modules/payments/components/methods/TransferPayment.vue'
import WalletPayment from '@/modules/payments/components/methods/WalletPayment.vue'
import { useCheckout } from '@/modules/payments/composables/useCheckout'
import { useCartStore } from '@/stores/cart'
import { useCheckoutStore } from '@/stores/checkout'
import { useDinerStore } from '@/stores/diner'
import { formatMoney } from '@/utils/money'

const route = useRoute()
const router = useRouter()
const cart = useCartStore()
const diner = useDinerStore()
const checkout = useCheckoutStore()
const { site, isLoading, total, deliveryFee, prepMinutes, fulfillmentError } = useCheckout()

const method = computed(() => (isCheckoutMethod(route.params.method) ? route.params.method : null))
const title = computed(() => (method.value ? paymentMethodLabel[method.value] : 'Pago'))
usePageTitle(title.value)

const amountLabel = computed(() => formatMoney(total.value, diner.currency))
const payeeName = computed(() => `RentaSol · ${diner.restaurantName ?? ''}`.trim())
const processing = ref(false)

/* Ruta sin método válido, sin productos o con la entrega incompleta: se vuelve al paso que falta. */
watch(
  isLoading,
  (loading) => {
    if (loading) {
      return
    }

    if (!method.value) {
      void router.replace({ name: 'checkout' })
    } else if (cart.items.length === 0) {
      void router.replace({ name: 'cart' })
    } else if (fulfillmentError.value) {
      void router.replace({ name: 'checkout-fulfillment' })
    } else {
      checkout.method = method.value
    }
  },
  { immediate: true },
)

function fulfillmentDetail(): string {
  if (checkout.mode === 'dine-in') return `Mesa ${diner.tableCode}`
  if (checkout.mode === 'pickup') return `Llegada ${checkout.pickup.arrivalTime} · ${checkout.pickup.eatIn ? 'Come en el local' : 'Para llevar'}`
  return checkout.delivery.address
}

function readyAt(): string {
  if (checkout.mode === 'pickup') {
    return checkout.pickup.arrivalTime
  }

  const minutes = prepMinutes.value + (checkout.mode === 'delivery' ? 20 : 0)
  const date = new Date(Date.now() + minutes * 60000)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

/**
 * Pago simulado: no hay pasarela ni se registra el pedido en db.json todavía.
 * Arma el comprobante, vacía la orden y muestra el resultado.
 */
async function pay(paymentDetail: string): Promise<void> {
  if (!method.value || !checkout.mode || processing.value) {
    return
  }

  processing.value = true
  await new Promise((resolve) => window.setTimeout(resolve, 1400))

  const prefix = { 'dine-in': 'M', pickup: 'R', delivery: 'D' }[checkout.mode]
  checkout.lastReceipt = {
    code: `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`,
    restaurantName: site.value?.name ?? diner.restaurantName ?? '',
    mode: checkout.mode,
    fulfillmentDetail: fulfillmentDetail(),
    methodLabel: paymentMethodLabel[method.value],
    paymentDetail,
    items: cart.items.map((item) => ({ name: item.name, quantity: item.quantity, price: item.price })),
    deliveryFee: deliveryFee.value,
    total: total.value,
    currency: diner.currency,
    readyAt: readyAt(),
    createdAt: new Date().toISOString(),
  }

  cart.clear()
  checkout.method = null
  processing.value = false
  await router.replace({ name: 'checkout-result' })
}
</script>

<template>
  <div class="space-y-5 pb-8">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <RouterLink :to="{ name: 'checkout' }" class="font-label inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
          <span aria-hidden="true">←</span> Cambiar método
        </RouterLink>
        <h1 class="font-headline mt-1 text-3xl font-semibold text-on-surface">Pagar con {{ title }}</h1>
        <p v-if="checkout.mode" class="text-sm text-on-surface-variant">
          {{ diner.restaurantName }} · {{ fulfillmentLabel[checkout.mode] }}
        </p>
      </div>
    </div>

    <SkeletonBlock v-if="isLoading || !method" :rows="4" />

    <template v-else>
      <CardPayment v-if="method === 'card'" :amount-label="amountLabel" :processing="processing" @pay="pay" />
      <WalletPayment
        v-else-if="method === 'yape' || method === 'plin'"
        :wallet="method"
        :amount="total"
        :amount-label="amountLabel"
        :payee-name="payeeName"
        :processing="processing"
        @pay="pay"
      />
      <TransferPayment v-else-if="method === 'transfer'" :amount-label="amountLabel" :payee-name="payeeName" :processing="processing" @pay="pay" />
      <CashPayment v-else :amount="total" :currency="diner.currency" :mode="checkout.mode" :processing="processing" @pay="pay" />
    </template>
  </div>
</template>
