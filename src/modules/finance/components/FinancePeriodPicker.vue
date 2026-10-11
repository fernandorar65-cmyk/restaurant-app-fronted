<script setup lang="ts">
import { computed } from 'vue'

import { periodRange, shiftAnchor, toDateKey } from '@/modules/finance/period'
import type { FinancePeriod } from '@/modules/finance/types'

/** Selector Día / Mes / Año con flechas y fecha. No permite ir más allá de hoy. */
const period = defineModel<FinancePeriod>('period', { required: true })
const anchor = defineModel<string>('anchor', { required: true })

const today = toDateKey(new Date())

const PERIODS: Array<{ value: FinancePeriod; label: string }> = [
  { value: 'day', label: 'Día' },
  { value: 'month', label: 'Mes' },
  { value: 'year', label: 'Año' },
]

const years = computed(() => {
  const current = new Date().getFullYear()
  return [current, current - 1]
})

const canGoNext = computed(() => periodRange(period.value, shiftAnchor(period.value, anchor.value, 1)).from <= today)

function shift(step: -1 | 1): void {
  const next = shiftAnchor(period.value, anchor.value, step)
  anchor.value = next > today ? today : next
}

const monthValue = computed({
  get: () => anchor.value.slice(0, 7),
  set: (value: string) => {
    if (value) anchor.value = `${value}-01`
  },
})

const yearValue = computed({
  get: () => Number(anchor.value.slice(0, 4)),
  set: (value: number) => {
    anchor.value = `${value}-01-01`
  },
})

const inputClass = 'min-h-9 rounded-lg bg-transparent px-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary'
</script>

<template>
  <div class="flex flex-wrap items-center gap-3">
    <div class="grid grid-cols-3 gap-1 rounded-xl bg-surface-container p-1" role="radiogroup" aria-label="Período">
      <button
        v-for="option in PERIODS"
        :key="option.value"
        type="button"
        role="radio"
        :aria-checked="period === option.value"
        class="font-label min-h-9 rounded-lg px-4 text-sm font-semibold transition-colors"
        :class="period === option.value ? 'bg-surface-container-lowest text-on-surface shadow-sm' : 'text-on-surface-variant hover:text-on-surface'"
        @click="period = option.value"
      >
        {{ option.label }}
      </button>
    </div>

    <div class="flex items-center gap-1 rounded-xl bg-surface-container-lowest p-1 ring-1 ring-outline-variant/50">
      <button
        type="button"
        class="flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container"
        aria-label="Período anterior"
        @click="shift(-1)"
      >
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
      </button>
      <label class="sr-only" for="finance-date">Fecha</label>
      <input v-if="period === 'day'" id="finance-date" v-model="anchor" type="date" :max="today" :class="inputClass" />
      <input v-else-if="period === 'month'" id="finance-date" v-model="monthValue" type="month" :max="today.slice(0, 7)" :class="inputClass" />
      <select v-else id="finance-date" v-model.number="yearValue" :class="inputClass">
        <option v-for="year in years" :key="year" :value="year">{{ year }}</option>
      </select>
      <button
        type="button"
        class="flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container disabled:opacity-40"
        aria-label="Período siguiente"
        :disabled="!canGoNext"
        @click="shift(1)"
      >
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
        </svg>
      </button>
    </div>
  </div>
</template>
