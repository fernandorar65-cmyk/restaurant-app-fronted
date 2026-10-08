<script setup lang="ts">
import { computed } from 'vue'

export type DinerNoticeKind =
  | 'invalid-qr'
  | 'table-maintenance'
  | 'table-inactive'
  | 'restaurant-closed'
  | 'empty-menu'
  | 'attention-closed'
  | 'connection'
  | 'no-table'
  | 'info'

const props = defineProps<{
  kind: DinerNoticeKind
  title?: string
  message?: string
}>()

const emit = defineEmits<{
  retry: []
}>()

const DEFAULTS: Record<DinerNoticeKind, { title: string; message: string; tone: 'error' | 'neutral' | 'primary' }> = {
  'invalid-qr': {
    title: 'Código QR no válido',
    message: 'Este código QR no es válido o fue desactivado. Pide ayuda a un mozo.',
    tone: 'error',
  },
  'table-maintenance': {
    title: 'Mesa en mantenimiento',
    message: 'Esta mesa no está disponible por ahora. Un mozo te ayudará a ubicarte en otra.',
    tone: 'error',
  },
  'table-inactive': {
    title: 'Mesa no habilitada',
    message: 'Esta mesa no está habilitada para pedir. Pide ayuda a un mozo.',
    tone: 'error',
  },
  'restaurant-closed': {
    title: 'Sede no disponible',
    message: 'Esta sede no está recibiendo pedidos en este momento.',
    tone: 'error',
  },
  'empty-menu': {
    title: 'Carta no disponible',
    message: 'Esta sede todavía no publicó su carta. Pide ayuda a un mozo.',
    tone: 'neutral',
  },
  'attention-closed': {
    title: 'Esta cuenta ya se cerró',
    message: 'La atención de esta mesa ya terminó. Si quieres pedir de nuevo, vuelve a escanear el QR de tu mesa.',
    tone: 'neutral',
  },
  connection: {
    title: 'Sin conexión',
    message: 'No pudimos conectarnos con el restaurante. Revisa tu conexión e inténtalo de nuevo.',
    tone: 'error',
  },
  'no-table': {
    title: 'Escanea el QR de tu mesa',
    message: 'Para hacer un pedido necesitamos saber en qué mesa estás. Escanea el código QR que está en tu mesa.',
    tone: 'primary',
  },
  info: { title: '', message: '', tone: 'neutral' },
}

const config = computed(() => DEFAULTS[props.kind])

const iconClass = computed(() => {
  switch (config.value.tone) {
    case 'error':
      return 'bg-error-container text-on-error-container'
    case 'primary':
      return 'bg-primary text-on-primary'
    default:
      return 'bg-surface-container text-on-surface-variant'
  }
})
</script>

<template>
  <div class="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center" role="status">
    <span class="flex h-14 w-14 items-center justify-center rounded-2xl" :class="iconClass" aria-hidden="true">
      <svg v-if="config.tone === 'error'" class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
        />
      </svg>
      <svg v-else class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z"
        />
      </svg>
    </span>
    <h1 class="font-headline text-xl font-semibold text-on-surface">{{ title ?? config.title }}</h1>
    <p class="text-sm text-on-surface-variant">{{ message ?? config.message }}</p>
    <div class="flex flex-wrap justify-center gap-2">
      <button
        v-if="kind === 'connection'"
        type="button"
        class="font-label rounded-xl bg-primary min-h-12 px-5 text-base inline-flex items-center justify-center font-semibold text-on-primary shadow-sm hover:bg-primary-container"
        @click="emit('retry')"
      >
        Reintentar
      </button>
      <slot />
    </div>
  </div>
</template>
