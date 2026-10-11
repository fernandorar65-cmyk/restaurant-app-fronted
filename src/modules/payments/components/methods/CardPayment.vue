<script setup lang="ts">
import { computed, reactive, ref } from 'vue'

import BaseButton from '@/components/base/BaseButton.vue'

/** Pago con tarjeta: solo visual, ningún dato sale del navegador. */
defineProps<{
  amountLabel: string
  processing: boolean
}>()

const emit = defineEmits<{
  pay: [detail: string]
}>()

const form = reactive({ number: '', holder: '', expiry: '', cvv: '' })
const touched = ref(false)

const digits = computed(() => form.number.replace(/\D/g, ''))

const brand = computed(() => {
  if (/^4/.test(digits.value)) return 'Visa'
  if (/^(5[1-5]|2[2-7])/.test(digits.value)) return 'Mastercard'
  if (/^3[47]/.test(digits.value)) return 'American Express'
  return null
})

const cvvLength = computed(() => (brand.value === 'American Express' ? 4 : 3))

/** Algoritmo de Luhn: detecta errores de tipeo en el número. */
function passesLuhn(value: string): boolean {
  let sum = 0
  for (let index = 0; index < value.length; index++) {
    let digit = Number(value[value.length - 1 - index])
    if (index % 2 === 1) {
      digit *= 2
      if (digit > 9) digit -= 9
    }
    sum += digit
  }
  return value.length > 0 && sum % 10 === 0
}

const errors = computed(() => {
  const [month, year] = form.expiry.split('/').map(Number)
  const now = new Date()
  const expired =
    !month || !year || month < 1 || month > 12 || 2000 + year < now.getFullYear() || (2000 + year === now.getFullYear() && month < now.getMonth() + 1)

  return {
    number: digits.value.length < 13 || !passesLuhn(digits.value) ? 'Revisa el número de la tarjeta.' : null,
    holder: form.holder.trim().length < 3 ? 'Escribe el nombre como aparece en la tarjeta.' : null,
    expiry: expired ? 'Fecha de vencimiento no válida.' : null,
    cvv: form.cvv.length !== cvvLength.value ? `El código tiene ${cvvLength.value} dígitos.` : null,
  }
})

const isValid = computed(() => Object.values(errors.value).every((error) => error === null))

/** Agrupa de 4 en 4 mientras se escribe. */
function onNumberInput(event: Event): void {
  const value = (event.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, 19)
  form.number = value.replace(/(.{4})/g, '$1 ').trim()
}

function onExpiryInput(event: Event): void {
  const value = (event.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, 4)
  form.expiry = value.length > 2 ? `${value.slice(0, 2)}/${value.slice(2)}` : value
}

function onCvvInput(event: Event): void {
  form.cvv = (event.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, cvvLength.value)
}

function submit(): void {
  touched.value = true

  if (isValid.value) {
    emit('pay', `${brand.value ?? 'Tarjeta'} •••• ${digits.value.slice(-4)}`)
  }
}

const previewNumber = computed(() => {
  const padded = digits.value.padEnd(16, '•')
  return padded.replace(/(.{4})/g, '$1 ').trim()
})

const inputClass =
  'min-h-12 w-full rounded-xl bg-surface px-4 text-base text-on-surface outline-none ring-1 ring-outline-variant/60 placeholder:text-outline focus:ring-2 focus:ring-primary'
</script>

<template>
  <form class="space-y-5" novalidate @submit.prevent="submit">
    <!-- Vista previa -->
    <div
      class="relative mx-auto aspect-[1.586] w-full max-w-sm overflow-hidden rounded-2xl bg-gradient-to-br from-[#1e3a8a] via-[#1e40af] to-[#0f172a] p-5 text-white shadow-lg"
      aria-hidden="true"
    >
      <div class="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10" />
      <div class="absolute -bottom-16 -left-10 h-48 w-48 rounded-full bg-white/5" />
      <div class="relative flex h-full flex-col justify-between">
        <div class="flex items-start justify-between">
          <span class="h-8 w-11 rounded-md bg-gradient-to-br from-amber-200 to-amber-400" />
          <span class="font-label text-sm font-bold tracking-wide">{{ brand ?? 'Tarjeta' }}</span>
        </div>
        <p class="font-mono text-lg tracking-widest sm:text-xl">{{ previewNumber }}</p>
        <div class="flex items-end justify-between gap-4 text-xs">
          <span class="min-w-0">
            <span class="block text-white/60 uppercase">Titular</span>
            <span class="block truncate font-semibold tracking-wide uppercase">{{ form.holder || 'Nombre apellido' }}</span>
          </span>
          <span class="shrink-0 text-right">
            <span class="block text-white/60 uppercase">Vence</span>
            <span class="block font-semibold">{{ form.expiry || 'MM/AA' }}</span>
          </span>
        </div>
      </div>
    </div>

    <div class="space-y-3 rounded-2xl bg-surface-container-lowest p-4 ring-1 ring-outline-variant/40">
      <label class="block space-y-1">
        <span class="text-xs font-semibold text-on-surface-variant">Número de tarjeta</span>
        <input
          :value="form.number"
          :class="inputClass"
          inputmode="numeric"
          autocomplete="cc-number"
          placeholder="0000 0000 0000 0000"
          @input="onNumberInput"
        />
        <span v-if="touched && errors.number" class="block text-xs text-error">{{ errors.number }}</span>
      </label>
      <label class="block space-y-1">
        <span class="text-xs font-semibold text-on-surface-variant">Nombre en la tarjeta</span>
        <input v-model="form.holder" :class="inputClass" autocomplete="cc-name" placeholder="Como aparece impreso" />
        <span v-if="touched && errors.holder" class="block text-xs text-error">{{ errors.holder }}</span>
      </label>
      <div class="grid grid-cols-2 gap-3">
        <label class="block space-y-1">
          <span class="text-xs font-semibold text-on-surface-variant">Vencimiento</span>
          <input :value="form.expiry" :class="inputClass" inputmode="numeric" autocomplete="cc-exp" placeholder="MM/AA" @input="onExpiryInput" />
          <span v-if="touched && errors.expiry" class="block text-xs text-error">{{ errors.expiry }}</span>
        </label>
        <label class="block space-y-1">
          <span class="text-xs font-semibold text-on-surface-variant">CVV</span>
          <input
            :value="form.cvv"
            :class="inputClass"
            inputmode="numeric"
            autocomplete="cc-csc"
            :placeholder="cvvLength === 4 ? '0000' : '000'"
            @input="onCvvInput"
          />
          <span v-if="touched && errors.cvv" class="block text-xs text-error">{{ errors.cvv }}</span>
        </label>
      </div>
      <p class="flex items-center gap-2 text-xs text-on-surface-variant">
        <svg class="h-4 w-4 shrink-0 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
          />
        </svg>
        Vista de demostración: usa 4242 4242 4242 4242. No se guarda ni se envía ningún dato.
      </p>
    </div>

    <BaseButton variant="primary" size="lg" block type="submit" :loading="processing">
      {{ processing ? 'Procesando pago…' : `Pagar ${amountLabel}` }}
    </BaseButton>
  </form>
</template>
