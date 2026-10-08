<script setup lang="ts">
import { computed } from 'vue'

export type StatusTone = 'neutral' | 'info' | 'progress' | 'success' | 'warning' | 'danger' | 'muted'

const props = withDefaults(
  defineProps<{
    tone: StatusTone
    label: string
    size?: 'sm' | 'md'
  }>(),
  { size: 'sm' },
)

const TONE: Record<StatusTone, string> = {
  neutral: 'bg-secondary-container text-on-surface',
  info: 'bg-primary-fixed text-on-primary-fixed',
  progress: 'bg-primary text-on-primary',
  success: 'bg-success-container text-on-success-container',
  warning: 'bg-warning-container text-on-warning-container',
  danger: 'bg-error-container text-on-error-container',
  muted: 'bg-surface-container-high text-on-surface-variant',
}

/* Cada tono lleva su ícono: el estado nunca depende solo del color. */
const ICON: Record<StatusTone, string> = {
  neutral: 'M12 6v6l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  info: 'm4.5 12.75 6 6 9-13.5',
  progress: 'M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99',
  success: 'M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  warning: 'M12 9v3.75m0 3.75h.008M10.29 3.86 1.82 18a1.875 1.875 0 0 0 1.61 2.813h17.14A1.875 1.875 0 0 0 22.18 18L13.71 3.86a1.875 1.875 0 0 0-3.42 0Z',
  danger: 'm9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  muted: 'M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636',
}

const classes = computed(() => [
  'font-label inline-flex shrink-0 items-center gap-1 rounded-full font-semibold whitespace-nowrap',
  props.size === 'md' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs',
  TONE[props.tone],
])
</script>

<template>
  <span :class="classes">
    <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
      <path stroke-linecap="round" stroke-linejoin="round" :d="ICON[tone]" />
    </svg>
    {{ label }}
  </span>
</template>
