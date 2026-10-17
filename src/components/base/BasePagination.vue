<script setup lang="ts">
import { computed } from 'vue'

/** Paginado de listas: rango mostrado, tamaño de página y navegación por números. */
const props = withDefaults(
  defineProps<{
    total: number
    pageSizeOptions?: number[]
    /** Sustantivo en plural para el resumen, ej. "gastos". */
    itemLabel?: string
  }>(),
  { pageSizeOptions: () => [15, 30, 50], itemLabel: 'registros' },
)

const page = defineModel<number>('page', { required: true })
const pageSize = defineModel<number>('pageSize', { required: true })

const pageCount = computed(() => Math.max(1, Math.ceil(props.total / pageSize.value)))
const from = computed(() => (props.total === 0 ? 0 : (page.value - 1) * pageSize.value + 1))
const to = computed(() => Math.min(props.total, page.value * pageSize.value))

/** Números a mostrar: primera, última y las vecinas de la actual; null = "…". */
const pages = computed<Array<number | null>>(() => {
  const count = pageCount.value
  const current = page.value
  if (count <= 7) return Array.from({ length: count }, (_, index) => index + 1)

  const set = new Set([1, count, current - 1, current, current + 1])
  if (current <= 3) [2, 3, 4].forEach((value) => set.add(value))
  if (current >= count - 2) [count - 3, count - 2, count - 1].forEach((value) => set.add(value))

  const sorted = [...set].filter((value) => value >= 1 && value <= count).sort((a, b) => a - b)
  return sorted.flatMap((value, index) => (index > 0 && value - sorted[index - 1]! > 1 ? [null, value] : [value]))
})

function go(target: number): void {
  page.value = Math.min(pageCount.value, Math.max(1, target))
}

function changeSize(event: Event): void {
  const size = Number((event.target as HTMLSelectElement).value)
  // Se mantiene a la vista el primer elemento de la página actual.
  const firstIndex = (page.value - 1) * pageSize.value
  pageSize.value = size
  page.value = Math.floor(firstIndex / size) + 1
}

const navButton =
  'flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm font-semibold tabular-nums transition-colors disabled:pointer-events-none disabled:opacity-30'
</script>

<template>
  <nav class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2" aria-label="Paginado">
    <div class="flex items-center gap-3 text-sm text-on-surface-variant">
      <span class="tabular-nums" aria-live="polite">{{ from }}–{{ to }} de {{ total }} {{ itemLabel }}</span>
      <label class="flex items-center gap-1.5">
        <span class="hidden sm:inline">Por página</span>
        <select
          :value="pageSize"
          class="min-h-9 rounded-lg bg-surface-container px-2 text-sm font-semibold text-on-surface outline-none"
          aria-label="Elementos por página"
          @change="changeSize"
        >
          <option v-for="size in pageSizeOptions" :key="size" :value="size">{{ size }}</option>
        </select>
      </label>
    </div>

    <div v-if="pageCount > 1" class="flex items-center gap-1">
      <button type="button" :class="[navButton, 'text-on-surface-variant hover:bg-surface-container']" :disabled="page <= 1" aria-label="Página anterior" @click="go(page - 1)">
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
      </button>
      <template v-for="(value, index) in pages" :key="value ?? `gap-${index}`">
        <span v-if="value === null" class="px-1 text-sm text-outline" aria-hidden="true">…</span>
        <button
          v-else
          type="button"
          :class="[navButton, value === page ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container']"
          :aria-current="value === page ? 'page' : undefined"
          :aria-label="`Página ${value}`"
          @click="go(value)"
        >
          {{ value }}
        </button>
      </template>
      <button type="button" :class="[navButton, 'text-on-surface-variant hover:bg-surface-container']" :disabled="page >= pageCount" aria-label="Página siguiente" @click="go(page + 1)">
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
        </svg>
      </button>
    </div>
  </nav>
</template>
