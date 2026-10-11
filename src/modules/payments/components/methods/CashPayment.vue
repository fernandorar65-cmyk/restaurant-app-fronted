<script setup lang="ts">
import { computed, ref } from 'vue'

import BaseButton from '@/components/base/BaseButton.vue'
import type { FulfillmentMode } from '@/modules/payments/checkout'
import { formatMoney } from '@/utils/money'

/** Pago en efectivo al recibir: indica con cuánto paga para llevar el vuelto preparado. */
const props = defineProps<{
  amount: number
  currency: string
  mode: FulfillmentMode | null
  processing: boolean
}>()

const emit = defineEmits<{
  pay: [detail: string]
}>()

const WHERE: Record<FulfillmentMode, string> = {
  'dine-in': 'Pagas al personal en tu mesa.',
  pickup: 'Pagas en caja cuando llegues al local.',
  delivery: 'Pagas al repartidor cuando recibas tu pedido.',
}

/** Montos habituales: exacto y los siguientes billetes redondos. */
const quickAmounts = computed(() => {
  const options = new Set<number>([props.amount])

  for (const step of [10, 20, 50, 100]) {
    options.add(Math.ceil(props.amount / step) * step)
  }

  return [...options].sort((a, b) => a - b).slice(0, 4)
})

const payWith = ref<number | null>(null)
const custom = ref<number | ''>('')
const touched = ref(false)

const selected = computed(() => (custom.value !== '' ? Number(custom.value) : payWith.value))
const change = computed(() => (selected.value !== null ? selected.value - props.amount : null))
const error = computed(() => {
  if (selected.value === null || Number.isNaN(selected.value)) {
    return 'Indica con cuánto vas a pagar.'
  }

  return selected.value < props.amount ? 'El monto no cubre el total.' : null
})

function choose(value: number): void {
  custom.value = ''
  payWith.value = value
}

function submit(): void {
  touched.value = true

  if (!error.value && selected.value !== null) {
    const detail =
      change.value && change.value > 0
        ? `Efectivo · paga con ${formatMoney(selected.value, props.currency)}, vuelto ${formatMoney(change.value, props.currency)}`
        : 'Efectivo · monto exacto'
    emit('pay', detail)
  }
}
</script>

<template>
  <form class="space-y-5" novalidate @submit.prevent="submit">
    <section class="space-y-4 rounded-2xl bg-surface-container-lowest p-4 ring-1 ring-outline-variant/40">
      <div class="flex items-baseline justify-between gap-3">
        <h2 class="font-headline text-lg font-semibold text-on-surface">A pagar</h2>
        <span class="font-headline text-2xl font-semibold text-on-surface">{{ formatMoney(amount, currency) }}</span>
      </div>
      <p v-if="mode" class="flex gap-2 rounded-xl bg-surface-container-low p-3 text-sm text-on-surface-variant">
        <svg class="mt-0.5 h-4 w-4 shrink-0 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
        </svg>
        {{ WHERE[mode] }}
      </p>

      <div>
        <p class="mb-2 text-sm font-semibold text-on-surface">¿Con cuánto pagarás?</p>
        <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <button
            v-for="(value, index) in quickAmounts"
            :key="value"
            type="button"
            class="font-label min-h-12 rounded-xl text-sm font-semibold transition-colors"
            :class="
              custom === '' && payWith === value
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
            "
            @click="choose(value)"
          >
            {{ index === 0 ? 'Exacto' : formatMoney(value, currency) }}
          </button>
        </div>
      </div>

      <label class="block space-y-1">
        <span class="text-xs font-semibold text-on-surface-variant">Otro monto</span>
        <input
          v-model="custom"
          class="min-h-12 w-full rounded-xl bg-surface px-4 text-base text-on-surface outline-none ring-1 ring-outline-variant/60 placeholder:text-outline focus:ring-2 focus:ring-primary"
          type="number"
          inputmode="decimal"
          min="0"
          step="0.01"
          placeholder="0,00"
        />
      </label>

      <p v-if="change !== null && change > 0" class="flex items-center justify-between rounded-xl bg-success-container px-3 py-2 text-sm text-on-success-container">
        <span>Tu vuelto</span>
        <strong>{{ formatMoney(change, currency) }}</strong>
      </p>
      <p v-if="touched && error" class="text-xs text-error">{{ error }}</p>
    </section>

    <BaseButton variant="primary" size="lg" block type="submit" :loading="processing">
      {{ processing ? 'Confirmando…' : 'Confirmar pedido' }}
    </BaseButton>
  </form>
</template>
