<script setup lang="ts">
import { computed, ref } from 'vue'

import BaseButton from '@/components/base/BaseButton.vue'

/** Pago con billetera móvil (Yape o Plin): QR, número de destino y código de operación. Solo visual. */
const props = defineProps<{
  wallet: 'yape' | 'plin'
  amount: number
  amountLabel: string
  payeeName: string
  processing: boolean
}>()

const emit = defineEmits<{
  pay: [detail: string]
}>()

/** Datos de ejemplo hasta tener la cuenta real del restaurante. */
const PAYEE_PHONE = '987 654 321'

const WALLETS = {
  yape: { name: 'Yape', accent: 'bg-[#742284]', app: 'tu app Yape' },
  plin: { name: 'Plin', accent: 'bg-[#00a19b]', app: 'la app de tu banco con Plin' },
} as const

const info = computed(() => WALLETS[props.wallet])
const operationCode = ref('')
const touched = ref(false)
const copied = ref(false)

const error = computed(() => (/^\d{6,10}$/.test(operationCode.value) ? null : 'Ingresa el código de operación (6 a 10 dígitos).'))

const qrUrl = computed(() => {
  const payload = `${props.wallet}:${PAYEE_PHONE.replace(/\s/g, '')}?monto=${props.amount.toFixed(2)}&nombre=${props.payeeName}`
  return `https://api.qrserver.com/v1/create-qr-code/?size=360x360&margin=8&data=${encodeURIComponent(payload)}`
})

async function copyPhone(): Promise<void> {
  try {
    await navigator.clipboard.writeText(PAYEE_PHONE.replace(/\s/g, ''))
    copied.value = true
    window.setTimeout(() => (copied.value = false), 2000)
  } catch {
    // Portapapeles no disponible: el número sigue visible.
  }
}

function submit(): void {
  touched.value = true

  if (!error.value) {
    emit('pay', `${info.value.name} · operación ${operationCode.value}`)
  }
}
</script>

<template>
  <form class="space-y-5" novalidate @submit.prevent="submit">
    <section class="overflow-hidden rounded-2xl bg-surface-container-lowest ring-1 ring-outline-variant/40">
      <div class="flex items-center justify-between px-4 py-3 text-white" :class="info.accent">
        <span class="font-headline text-lg font-semibold">{{ info.name }}</span>
        <span class="font-headline text-xl font-semibold">{{ amountLabel }}</span>
      </div>
      <div class="flex flex-col items-center gap-3 p-5">
        <img :src="qrUrl" :alt="`Código QR para pagar con ${info.name}`" class="h-52 w-52 rounded-xl bg-white p-2 ring-1 ring-outline-variant/40" />
        <p class="text-center text-sm text-on-surface-variant">
          Escanea el código con {{ info.app }}<br />o envía el monto al número:
        </p>
        <button
          type="button"
          class="font-label inline-flex min-h-11 items-center gap-2 rounded-full bg-surface-container px-4 text-base font-bold tracking-wide text-on-surface hover:bg-surface-container-high"
          @click="copyPhone"
        >
          {{ PAYEE_PHONE }}
          <span class="text-xs font-semibold text-primary">{{ copied ? 'Copiado' : 'Copiar' }}</span>
        </button>
        <p class="text-xs text-on-surface-variant">A nombre de <strong class="text-on-surface">{{ payeeName }}</strong></p>
      </div>
    </section>

    <ol class="space-y-2 text-sm text-on-surface-variant">
      <li class="flex gap-3">
        <span class="font-label flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-xs font-bold text-on-primary-fixed">1</span>
        Abre {{ info.app }} y escanea el QR o usa el número.
      </li>
      <li class="flex gap-3">
        <span class="font-label flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-xs font-bold text-on-primary-fixed">2</span>
        Paga exactamente {{ amountLabel }}.
      </li>
      <li class="flex gap-3">
        <span class="font-label flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-xs font-bold text-on-primary-fixed">3</span>
        Escribe aquí el código de operación que te muestra la app.
      </li>
    </ol>

    <label class="block space-y-1 rounded-2xl bg-surface-container-lowest p-4 ring-1 ring-outline-variant/40">
      <span class="text-xs font-semibold text-on-surface-variant">Código de operación</span>
      <input
        v-model="operationCode"
        class="min-h-12 w-full rounded-xl bg-surface px-4 text-base tracking-widest text-on-surface outline-none ring-1 ring-outline-variant/60 placeholder:tracking-normal placeholder:text-outline focus:ring-2 focus:ring-primary"
        inputmode="numeric"
        maxlength="10"
        placeholder="Ej: 12345678"
        @input="operationCode = operationCode.replace(/\D/g, '')"
      />
      <span v-if="touched && error" class="block text-xs text-error">{{ error }}</span>
      <span class="block pt-1 text-xs text-on-surface-variant">Vista de demostración: el número y el QR son de ejemplo.</span>
    </label>

    <BaseButton variant="primary" size="lg" block type="submit" :loading="processing">
      {{ processing ? 'Verificando pago…' : 'Ya pagué' }}
    </BaseButton>
  </form>
</template>
