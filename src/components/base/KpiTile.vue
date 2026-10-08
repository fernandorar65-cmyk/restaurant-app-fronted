<script setup lang="ts">
defineProps<{
  label: string
  value: string | number
  hint?: string
  tone?: 'default' | 'danger' | 'success' | 'warning'
}>()

const VALUE_TONE = {
  default: 'text-on-surface',
  danger: 'text-error',
  success: 'text-success',
  warning: 'text-warning',
} as const
</script>

<template>
  <article class="rounded-2xl bg-surface-container-lowest p-4 shadow-sm sm:p-5">
    <p class="text-sm font-medium text-on-surface-variant">{{ label }}</p>
    <p class="font-headline pt-1 text-3xl font-semibold tracking-tight tabular-nums" :class="VALUE_TONE[tone ?? 'default']">
      {{ value }}
    </p>
    <p v-if="hint" class="mt-1 text-sm text-on-surface-variant">{{ hint }}</p>
    <slot />
  </article>
</template>
