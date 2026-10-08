<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import BaseButton from '@/components/base/BaseButton.vue'
import { usePageTitle } from '@/composables/usePageTitle'
import { paymentMethodLabel } from '@/modules/payments/api'
import TableCodeDialog from '@/modules/payments/components/TableCodeDialog.vue'
import type { PaymentMethod } from '@/modules/payments/types'
import { useCartStore } from '@/stores/cart'
import { useDinerStore } from '@/stores/diner'
import { useToastStore } from '@/stores/toast'
import { formatMoney } from '@/utils/money'

usePageTitle('Pago')

const cart = useCartStore()
const diner = useDinerStore()
const toast = useToastStore()
const router = useRouter()

interface MethodOption {
  method: PaymentMethod
  hint: string
  icon: string
}

const METHODS: MethodOption[] = [
  {
    method: 'card',
    hint: 'Crédito o débito',
    icon: 'M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z',
  },
  {
    method: 'yape',
    hint: 'Paga con tu celular',
    icon: 'M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3',
  },
  {
    method: 'plin',
    hint: 'Paga con tu celular',
    icon: 'M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3',
  },
  {
    method: 'transfer',
    hint: 'Desde tu banco',
    icon: 'M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0 0 12 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75Z',
  },
  {
    method: 'cash',
    hint: 'Al personal, en tu mesa',
    icon: 'M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z',
  },
]

const selected = ref<PaymentMethod | null>(null)
const isEditingTable = ref(false)

const total = computed(() => formatMoney(cart.subtotal, diner.currency))

function saveTableCode(code: string): void {
  if (diner.restaurantId) {
    diner.setTableCode(diner.restaurantId, code)
  }
}

function pay(): void {
  if (!selected.value || !diner.tableCode) {
    return
  }

  // Pendiente: el cobro real (pasarela, Yape/Plin, etc.) llegará con la integración del backend.
  toast.show('Pago en preparación', {
    message: `${paymentMethodLabel[selected.value]} · Mesa ${diner.tableCode} · ${total.value}. El cobro se conectará con el backend.`,
    tone: 'info',
  })
}

/* Sin productos o sin código de mesa no hay nada que pagar aquí: se vuelve a la orden. */
onMounted(() => {
  if (cart.items.length === 0 || !diner.tableCode) {
    void router.replace({ name: 'cart' })
  }
})
</script>

<template>
  <div class="space-y-6 pb-8">
    <div>
      <h1 class="font-headline text-3xl font-semibold text-on-surface">Método de pago</h1>
      <p class="text-sm text-on-surface-variant">Elige cómo quieres pagar tu orden.</p>
    </div>

    <!-- Resumen -->
    <section class="divide-y divide-outline-variant/50 rounded-2xl bg-surface-container-lowest ring-1 ring-outline-variant/40">
      <div class="flex items-center justify-between gap-3 px-4 py-3">
        <span class="min-w-0">
          <span class="block text-xs text-on-surface-variant">Sede</span>
          <span class="block truncate text-sm font-semibold text-on-surface">{{ diner.restaurantName }}</span>
        </span>
      </div>
      <div class="flex items-center justify-between gap-3 px-4 py-3">
        <span class="min-w-0">
          <span class="block text-xs text-on-surface-variant">Mesa</span>
          <span class="block truncate text-sm font-semibold text-on-surface">{{ diner.tableCode }}</span>
        </span>
        <button
          type="button"
          class="font-label min-h-10 shrink-0 rounded-lg px-3 text-sm font-semibold text-primary hover:bg-surface-container-low"
          @click="isEditingTable = true"
        >
          Cambiar
        </button>
      </div>
      <div class="flex items-center justify-between gap-3 px-4 py-3">
        <span class="text-sm text-on-surface-variant">{{ cart.itemCount }} {{ cart.itemCount === 1 ? 'producto' : 'productos' }}</span>
        <span class="font-headline text-2xl font-semibold text-on-surface">{{ total }}</span>
      </div>
    </section>

    <!-- Métodos -->
    <fieldset class="space-y-2">
      <legend class="font-label mb-2 text-xs font-semibold tracking-wider text-outline uppercase">Paga con</legend>
      <label
        v-for="option in METHODS"
        :key="option.method"
        class="flex min-h-16 cursor-pointer items-center gap-3 rounded-2xl bg-surface-container-lowest px-4 py-3 ring-1 transition"
        :class="selected === option.method ? 'ring-2 ring-primary' : 'ring-outline-variant/40 hover:ring-outline-variant'"
      >
        <input v-model="selected" type="radio" name="payment-method" :value="option.method" class="sr-only" />
        <span
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          :class="selected === option.method ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'"
          aria-hidden="true"
        >
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
            <path stroke-linecap="round" stroke-linejoin="round" :d="option.icon" />
          </svg>
        </span>
        <span class="min-w-0 flex-1">
          <span class="block text-sm font-semibold text-on-surface">{{ paymentMethodLabel[option.method] }}</span>
          <span class="block text-xs text-on-surface-variant">{{ option.hint }}</span>
        </span>
        <span
          class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full ring-2"
          :class="selected === option.method ? 'bg-primary ring-primary' : 'ring-outline-variant'"
          aria-hidden="true"
        >
          <span v-if="selected === option.method" class="h-2 w-2 rounded-full bg-on-primary" />
        </span>
      </label>
    </fieldset>

    <div class="sticky bottom-20 z-10 rounded-2xl bg-surface-container-lowest p-4 shadow-[0_-4px_24px_rgba(27,28,29,0.08)] ring-1 ring-outline-variant/30">
      <BaseButton variant="primary" size="lg" block :disabled="!selected" @click="pay">
        {{ selected ? `Pagar ${total}` : 'Elige un método de pago' }}
      </BaseButton>
    </div>

    <TableCodeDialog
      v-if="isEditingTable"
      :initial-code="diner.tableCode"
      :restaurant-name="diner.restaurantName"
      @save="saveTableCode"
      @close="isEditingTable = false"
    />
  </div>
</template>
