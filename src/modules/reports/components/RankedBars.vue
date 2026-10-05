<script setup lang="ts">
import { computed } from 'vue'

import type { RankedItem } from '@/modules/reports/metrics'

const props = defineProps<{
  items: RankedItem[]
  /** Unidad que acompaña al valor en la etiqueta (ej: "uds"). */
  unit?: string
  format?: (value: number) => string
  emptyLabel?: string
}>()

const max = computed(() => Math.max(...props.items.map((item) => item.value), 1))

function label(value: number): string {
  return props.format ? props.format(value) : `${value}${props.unit ? ` ${props.unit}` : ''}`
}
</script>

<template>
  <p v-if="items.length === 0" class="text-sm text-on-surface-variant">{{ emptyLabel ?? 'Sin datos en este período.' }}</p>
  <!-- Una sola serie: barras horizontales de un tono, valor rotulado en tinta de texto. -->
  <ul v-else class="space-y-2.5">
    <li
      v-for="item in items"
      :key="item.label"
      class="group space-y-1 rounded-lg px-1 py-0.5 hover:bg-surface-container-low"
      :title="item.detail ? `${item.label}: ${label(item.value)} — ${item.detail}` : `${item.label}: ${label(item.value)}`"
    >
      <div class="flex items-baseline justify-between gap-3 text-sm">
        <span class="truncate text-on-surface">{{ item.label }}</span>
        <span class="shrink-0 font-semibold text-on-surface tabular-nums">{{ label(item.value) }}</span>
      </div>
      <div class="h-2 w-full rounded-full bg-surface-container">
        <div class="h-full rounded-r-[4px] rounded-l-full bg-primary" :style="{ width: `${(item.value / max) * 100}%` }" />
      </div>
      <p v-if="item.detail" class="truncate text-[11px] text-on-surface-variant">{{ item.detail }}</p>
    </li>
  </ul>
</template>
