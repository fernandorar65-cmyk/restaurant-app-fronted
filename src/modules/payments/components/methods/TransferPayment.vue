<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'

import BaseButton from '@/components/base/BaseButton.vue'

/** Transferencia bancaria: datos de la cuenta y comprobante. Solo visual; el archivo no se sube. */
const props = defineProps<{
  amountLabel: string
  payeeName: string
  processing: boolean
}>()

const emit = defineEmits<{
  pay: [detail: string]
}>()

/** Datos de ejemplo hasta tener la cuenta real de cada sede. */
const ACCOUNT = [
  { label: 'Banco', value: 'Banco Demo' },
  { label: 'Cuenta corriente', value: '191-0000000-0-00' },
  { label: 'CCI', value: '002-191-000000000000-00' },
]

const copiedLabel = ref<string | null>(null)
const voucher = ref<File | null>(null)
const voucherPreview = ref<string | null>(null)
const touched = ref(false)

const error = computed(() => (voucher.value ? null : 'Adjunta el comprobante de la transferencia.'))

async function copy(label: string, value: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(value.replace(/-/g, ''))
    copiedLabel.value = label
    window.setTimeout(() => (copiedLabel.value = null), 2000)
  } catch {
    // Portapapeles no disponible: el dato sigue visible.
  }
}

function onFile(event: Event): void {
  const file = (event.target as HTMLInputElement).files?.[0] ?? null

  if (voucherPreview.value) {
    URL.revokeObjectURL(voucherPreview.value)
  }

  voucher.value = file
  voucherPreview.value = file && file.type.startsWith('image/') ? URL.createObjectURL(file) : null
}

function submit(): void {
  touched.value = true

  if (!error.value && voucher.value) {
    emit('pay', `Transferencia · comprobante ${voucher.value.name}`)
  }
}

onBeforeUnmount(() => {
  if (voucherPreview.value) {
    URL.revokeObjectURL(voucherPreview.value)
  }
})
</script>

<template>
  <form class="space-y-5" novalidate @submit.prevent="submit">
    <section class="space-y-3 rounded-2xl bg-surface-container-lowest p-4 ring-1 ring-outline-variant/40">
      <div class="flex items-baseline justify-between gap-3">
        <h2 class="font-headline text-lg font-semibold text-on-surface">Transfiere a esta cuenta</h2>
        <span class="font-headline shrink-0 text-xl font-semibold text-on-surface">{{ amountLabel }}</span>
      </div>
      <dl class="divide-y divide-outline-variant/50 rounded-xl bg-surface-container-low">
        <div class="flex items-center justify-between gap-3 px-3 py-2.5">
          <span class="min-w-0">
            <dt class="text-xs text-on-surface-variant">Titular</dt>
            <dd class="truncate text-sm font-semibold text-on-surface">{{ props.payeeName }}</dd>
          </span>
        </div>
        <div v-for="item in ACCOUNT" :key="item.label" class="flex items-center justify-between gap-3 px-3 py-2.5">
          <span class="min-w-0">
            <dt class="text-xs text-on-surface-variant">{{ item.label }}</dt>
            <dd class="truncate font-mono text-sm font-semibold text-on-surface">{{ item.value }}</dd>
          </span>
          <button
            v-if="item.label !== 'Banco'"
            type="button"
            class="font-label min-h-9 shrink-0 rounded-lg px-3 text-xs font-semibold text-primary hover:bg-surface-container"
            @click="copy(item.label, item.value)"
          >
            {{ copiedLabel === item.label ? 'Copiado' : 'Copiar' }}
          </button>
        </div>
      </dl>
      <p class="text-xs text-on-surface-variant">Vista de demostración: los datos bancarios son de ejemplo.</p>
    </section>

    <section class="space-y-3 rounded-2xl bg-surface-container-lowest p-4 ring-1 ring-outline-variant/40">
      <h2 class="font-headline text-lg font-semibold text-on-surface">Comprobante</h2>
      <label
        class="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-5 text-center transition-colors"
        :class="voucher ? 'border-primary bg-primary-fixed/30' : 'border-outline-variant hover:bg-surface-container-low'"
      >
        <input type="file" accept="image/*,application/pdf" class="sr-only" @change="onFile" />
        <img v-if="voucherPreview" :src="voucherPreview" alt="Vista previa del comprobante" class="max-h-40 rounded-lg object-contain" />
        <svg v-else class="h-8 w-8 text-outline" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
          />
        </svg>
        <span class="text-sm font-semibold text-on-surface">{{ voucher ? voucher.name : 'Sube la captura o el PDF' }}</span>
        <span class="text-xs text-on-surface-variant">{{ voucher ? 'Toca para cambiarlo' : 'JPG, PNG o PDF' }}</span>
      </label>
      <p v-if="touched && error" class="text-xs text-error">{{ error }}</p>
    </section>

    <BaseButton variant="primary" size="lg" block type="submit" :loading="processing">
      {{ processing ? 'Enviando comprobante…' : 'Enviar comprobante' }}
    </BaseButton>
  </form>
</template>
