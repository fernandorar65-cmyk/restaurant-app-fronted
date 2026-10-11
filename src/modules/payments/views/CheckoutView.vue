<script setup lang="ts">
import { watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'

import BaseButton from '@/components/base/BaseButton.vue'
import SkeletonBlock from '@/components/base/SkeletonBlock.vue'
import { usePageTitle } from '@/composables/usePageTitle'
import { paymentMethodLabel } from '@/modules/payments/api'
import { ENABLED_CHECKOUT_METHODS, checkoutMethodInfo } from '@/modules/payments/checkout'
import CheckoutSummary from '@/modules/payments/components/CheckoutSummary.vue'
import { useCheckout } from '@/modules/payments/composables/useCheckout'
import { useCartStore } from '@/stores/cart'
import { useCheckoutStore } from '@/stores/checkout'
import { useDinerStore } from '@/stores/diner'
import { formatMoney } from '@/utils/money'

usePageTitle('Pago')

const cart = useCartStore()
const diner = useDinerStore()
const checkout = useCheckoutStore()
const router = useRouter()
const { isLoading, total, deliveryFee, fulfillmentError } = useCheckout()

/* Sin productos o sin datos de entrega completos no se puede elegir cómo pagar. */
watch(
  isLoading,
  (loading) => {
    if (loading) {
      return
    }

    if (cart.items.length === 0) {
      void router.replace({ name: 'cart' })
    } else if (fulfillmentError.value) {
      void router.replace({ name: 'checkout-fulfillment' })
    }
  },
  { immediate: true },
)

async function continueWithMethod(): Promise<void> {
  if (checkout.method) {
    await router.push({ name: 'checkout-method', params: { method: checkout.method } })
  }
}
</script>

<template>
  <div class="space-y-6 pb-8">
    <div>
      <h1 class="font-headline text-3xl font-semibold text-on-surface">Método de pago</h1>
      <p class="text-sm text-on-surface-variant">Elige cómo quieres pagar tu orden.</p>
    </div>

    <SkeletonBlock v-if="isLoading" :rows="4" />

    <template v-else>
      <CheckoutSummary :total="total" :delivery-fee="deliveryFee">
        <RouterLink
          :to="{ name: 'checkout-fulfillment' }"
          class="font-label min-h-10 shrink-0 rounded-lg px-3 py-2 text-sm font-semibold text-primary hover:bg-surface-container-low"
        >
          Cambiar
        </RouterLink>
      </CheckoutSummary>

      <fieldset class="space-y-2">
        <legend class="font-label mb-2 text-xs font-semibold tracking-wider text-outline uppercase">Paga con</legend>
        <label
          v-for="method in ENABLED_CHECKOUT_METHODS"
          :key="method"
          class="flex min-h-16 cursor-pointer items-center gap-3 rounded-2xl bg-surface-container-lowest px-4 py-3 ring-1 transition"
          :class="checkout.method === method ? 'ring-2 ring-primary' : 'ring-outline-variant/40 hover:ring-outline-variant'"
        >
          <input v-model="checkout.method" type="radio" name="payment-method" :value="method" class="sr-only" />
          <span
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            :class="checkout.method === method ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'"
            aria-hidden="true"
          >
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" :d="checkoutMethodInfo[method].icon" />
            </svg>
          </span>
          <span class="min-w-0 flex-1">
            <span class="block text-sm font-semibold text-on-surface">{{ paymentMethodLabel[method] }}</span>
            <span class="block text-xs text-on-surface-variant">
              {{ checkoutMethodInfo[method].hint }}
            </span>
          </span>
          <span
            class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full ring-2"
            :class="checkout.method === method ? 'bg-primary ring-primary' : 'ring-outline-variant'"
            aria-hidden="true"
          >
            <span v-if="checkout.method === method" class="h-2 w-2 rounded-full bg-on-primary" />
          </span>
        </label>
      </fieldset>

      <div class="sticky bottom-20 z-10 rounded-2xl bg-surface-container-lowest p-4 shadow-[0_-4px_24px_rgba(27,28,29,0.08)] ring-1 ring-outline-variant/30">
        <BaseButton variant="primary" size="lg" block :disabled="!checkout.method" @click="continueWithMethod">
          {{ checkout.method ? `Continuar · ${formatMoney(total, diner.currency)}` : 'Elige un método de pago' }}
        </BaseButton>
      </div>
    </template>
  </div>
</template>
