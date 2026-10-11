<script setup lang="ts">
import { computed, ref } from 'vue'

export interface BarItem {
  id: string
  label: string
  color: string
  value: number
  /** Líneas extra del tooltip (p. ej. ingresos y costos). */
  details: Array<{ label: string; value: string }>
}

/**
 * Barras horizontales por local, con el valor al final de cada barra. Admite negativos
 * (pérdidas): la barra crece a la izquierda del cero y su valor va a la derecha, para no
 * chocar con el nombre del local.
 */
const props = defineProps<{
  items: BarItem[]
  format: (value: number) => string
}>()

const emit = defineEmits<{
  /** Al tocar o pulsar Enter sobre un local. */
  select: [id: string]
}>()

const active = ref<string | null>(null)

/** Escala con un margen extra para que el valor quepa fuera del extremo de la barra más larga. */
const domain = computed(() => {
  const values = props.items.map((item) => item.value)
  const min = Math.min(0, ...values) * 1.35
  const max = Math.max(0, ...values) * 1.35
  return { min, max, span: max - min || 1 }
})

/** Posición del cero en porcentaje del ancho, para que las pérdidas crezcan a la izquierda. */
const zero = computed(() => (-domain.value.min / domain.value.span) * 100)

function barStyle(value: number): Record<string, string> {
  const size = (Math.abs(value) / domain.value.span) * 100
  return value >= 0 ? { left: `${zero.value}%`, width: `${size}%` } : { left: `${zero.value - size}%`, width: `${size}%` }
}
</script>

<template>
  <ul class="space-y-1">
    <li
      v-for="item in items"
      :key="item.id"
      class="relative grid cursor-pointer grid-cols-[7.5rem_1fr] items-center gap-3 rounded-lg px-1 py-2 outline-none transition-colors hover:bg-surface-container-low focus-visible:ring-2 focus-visible:ring-primary sm:grid-cols-[10rem_1fr]"
      tabindex="0"
      role="button"
      @click="emit('select', item.id)"
      @keydown.enter.prevent="emit('select', item.id)"
      @pointerenter="active = item.id"
      @pointerleave="active = null"
      @focus="active = item.id"
      @blur="active = null"
    >
      <span class="truncate text-sm text-on-surface" :title="item.label">{{ item.label }}</span>
      <!-- Pista de la barra; el valor va fuera del extremo para no recortarse -->
      <div class="relative h-6">
        <span class="absolute top-0 bottom-0 w-px bg-outline-variant" :style="{ left: `${zero}%` }" aria-hidden="true" />
        <span
          class="absolute top-0.5 h-5 transition-[filter]"
          :class="[item.value >= 0 ? 'rounded-r-[4px]' : 'rounded-l-[4px]', active === item.id ? 'brightness-110' : '']"
          :style="{ ...barStyle(item.value), background: item.color, maxHeight: '24px' }"
          aria-hidden="true"
        />
        <span
          class="absolute top-1/2 -translate-y-1/2 text-xs font-semibold whitespace-nowrap text-on-surface tabular-nums"
          :style="
            item.value >= 0
              ? { left: `calc(${Math.min(zero + (item.value / domain.span) * 100, 100)}% + 6px)` }
              : { left: `calc(${zero}% + 6px)` }
          "
        >
          {{ format(item.value) }}
        </span>
      </div>

      <div
        v-if="active === item.id"
        class="pointer-events-none absolute top-full left-1/3 z-10 mt-1 min-w-48 rounded-xl bg-surface-container-lowest px-3 py-2 text-sm shadow-lg ring-1 ring-outline-variant/50"
        role="status"
      >
        <p class="mb-1 flex items-center gap-2 text-xs text-on-surface-variant">
          <span class="h-2.5 w-2.5 rounded-sm" :style="{ background: item.color }" aria-hidden="true" />
          {{ item.label }}
        </p>
        <p v-for="detail in item.details" :key="detail.label" class="flex justify-between gap-4">
          <span class="text-on-surface-variant">{{ detail.label }}</span>
          <strong class="font-semibold text-on-surface tabular-nums">{{ detail.value }}</strong>
        </p>
      </div>
    </li>
  </ul>
</template>
