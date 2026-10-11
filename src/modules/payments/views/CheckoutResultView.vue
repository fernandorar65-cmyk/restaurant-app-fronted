<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

import BaseButton from '@/components/base/BaseButton.vue'
import { usePageTitle } from '@/composables/usePageTitle'
import { fulfillmentLabel } from '@/modules/payments/checkout'
import { useCheckoutStore } from '@/stores/checkout'
import { useDinerStore } from '@/stores/diner'
import { formatMoney } from '@/utils/money'

usePageTitle('Pedido confirmado')

const checkout = useCheckoutStore()
const diner = useDinerStore()
const router = useRouter()

const receipt = computed(() => checkout.lastReceipt)

const headline = computed(() => {
  switch (receipt.value?.mode) {
    case 'pickup':
      return `Te esperamos a las ${receipt.value.readyAt}`
    case 'delivery':
      return `Llega hacia las ${receipt.value.readyAt}`
    default:
      return `Estará listo hacia las ${receipt.value?.readyAt ?? ''}`
  }
})

/* Sin comprobante (por ejemplo, al recargar la página) no hay nada que mostrar. */
onMounted(() => {
  if (!receipt.value) {
    void router.replace({ name: 'home' })
  }
})
</script>

<template>
  <div v-if="receipt" class="mx-auto max-w-md space-y-5 pb-8">
    <div class="flex flex-col items-center gap-3 pt-4 text-center">
      <span class="flex h-20 w-20 items-center justify-center rounded-full bg-success-container text-success" aria-hidden="true">
        <svg class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
        </svg>
      </span>
      <h1 class="font-headline text-3xl font-semibold text-on-surface">¡Pedido confirmado!</h1>
      <p class="text-base text-on-surface-variant">{{ headline }}</p>
      <p class="font-label rounded-full bg-surface-container px-4 py-1.5 text-sm font-bold tracking-widest text-on-surface">
        Pedido {{ receipt.code }}
      </p>
    </div>

    <section class="divide-y divide-outline-variant/50 rounded-2xl bg-surface-container-lowest ring-1 ring-outline-variant/40">
      <div class="px-4 py-3">
        <span class="block text-xs text-on-surface-variant">{{ receipt.restaurantName }} · {{ fulfillmentLabel[receipt.mode] }}</span>
        <span class="block text-sm font-semibold text-on-surface">{{ receipt.fulfillmentDetail }}</span>
      </div>
      <ul class="space-y-1 px-4 py-3 text-sm">
        <li v-for="item in receipt.items" :key="item.name" class="flex justify-between gap-3">
          <span class="min-w-0 truncate text-on-surface">{{ item.quantity }} × {{ item.name }}</span>
          <span class="shrink-0 text-on-surface-variant">{{ formatMoney(item.price * item.quantity, receipt.currency) }}</span>
        </li>
        <li v-if="receipt.deliveryFee > 0" class="flex justify-between gap-3">
          <span class="text-on-surface">Envío</span>
          <span class="text-on-surface-variant">{{ formatMoney(receipt.deliveryFee, receipt.currency) }}</span>
        </li>
      </ul>
      <div class="flex items-baseline justify-between px-4 py-3">
        <span class="font-semibold text-on-surface">Total</span>
        <span class="font-headline text-2xl font-semibold text-on-surface">{{ formatMoney(receipt.total, receipt.currency) }}</span>
      </div>
      <div class="px-4 py-3">
        <span class="block text-xs text-on-surface-variant">Pago · {{ receipt.methodLabel }}</span>
        <span class="block text-sm text-on-surface">{{ receipt.paymentDetail }}</span>
      </div>
    </section>

    <p class="rounded-xl bg-warning-container px-4 py-3 text-xs text-on-warning-container">
      Vista de demostración: no se realizó ningún cobro y el pedido todavía no llega al restaurante. Se conectará con el
      sistema de pagos y el backend más adelante.
    </p>

    <div class="grid gap-2">
      <BaseButton variant="primary" size="lg" block :to="diner.menuRoute">Volver a la carta</BaseButton>
      <BaseButton variant="secondary" size="lg" block :to="{ name: 'home' }">Ir al inicio</BaseButton>
    </div>
  </div>
</template>
