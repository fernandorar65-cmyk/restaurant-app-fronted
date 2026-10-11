<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

export interface LineSeries {
  id: string
  label: string
  /** Color de la serie (variable CSS de la paleta, p. ej. var(--series-1)). */
  color: string
  /** null = sin dato (por ejemplo, días que aún no llegan): la línea se corta ahí. */
  values: Array<number | null>
}

const props = defineProps<{
  labels: string[]
  series: LineSeries[]
  /** Formato completo (tooltip y etiquetas). */
  format: (value: number) => string
  /** Formato corto (eje Y). */
  formatAxis: (value: number) => string
  /** Texto accesible del gráfico (los lectores de pantalla no ven el SVG). */
  description: string
  /** Punto incompleto (período en curso): se dibuja con un marcador hueco. */
  partialIndex?: number | null
}>()

const HEIGHT = 260
const MARGIN = { top: 16, bottom: 30, left: 64 }

const container = ref<HTMLElement | null>(null)
const width = ref(640)
const activeIndex = ref<number | null>(null)
let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  resizeObserver = new ResizeObserver(([entry]) => {
    if (entry) width.value = Math.max(280, entry.contentRect.width)
  })
  if (container.value) resizeObserver.observe(container.value)
})

onBeforeUnmount(() => resizeObserver?.disconnect())

/** Etiquetas al final de cada línea: solo con 4 series o menos (si no, leyenda + tooltip). */
const showEndLabels = computed(() => props.series.length > 0 && props.series.length <= 4 && width.value >= 520)
const marginRight = computed(() => (showEndLabels.value ? 112 : 16))
const plotWidth = computed(() => width.value - MARGIN.left - marginRight.value)
const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom

/** Escala Y con valores redondos que incluye el cero. */
const yScale = computed(() => {
  const all = props.series.flatMap((serie) => serie.values).filter((value): value is number => value !== null)
  const min = Math.min(0, ...all)
  const max = Math.max(0, ...all)
  const span = max - min || 1
  const rawStep = span / 4
  const magnitude = 10 ** Math.floor(Math.log10(rawStep))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((candidate) => candidate >= rawStep) ?? magnitude * 10
  const lo = Math.floor(min / step) * step
  const hi = Math.ceil(max / step) * step
  const ticks: number[] = []
  for (let value = lo; value <= hi + step / 2; value += step) ticks.push(Math.round(value * 100) / 100)
  return { lo, hi, ticks }
})

function y(value: number): number {
  const { lo, hi } = yScale.value
  return MARGIN.top + plotHeight - ((value - lo) / (hi - lo || 1)) * plotHeight
}

function x(index: number): number {
  const count = props.labels.length
  return MARGIN.left + (count <= 1 ? plotWidth.value / 2 : (index / (count - 1)) * plotWidth.value)
}

/** Último índice con dato: ahí van el punto final y la etiqueta. */
const lastIndex = computed(() => {
  let last = -1
  for (const serie of props.series) {
    serie.values.forEach((value, index) => {
      if (value !== null && index > last) last = index
    })
  }
  return last
})

const paths = computed(() =>
  props.series.map((serie) => {
    let d = ''
    let pen = false
    serie.values.forEach((value, index) => {
      if (value === null) {
        pen = false
        return
      }
      d += `${pen ? 'L' : 'M'}${x(index).toFixed(1)},${y(value).toFixed(1)} `
      pen = true
    })
    return { ...serie, d: d.trim() }
  }),
)

/** Marcas del eje X espaciadas para no encimarse (~70px entre etiquetas). */
const xTicks = computed(() => {
  const count = props.labels.length
  const every = Math.max(1, Math.ceil(count / Math.max(2, Math.floor(plotWidth.value / 70))))
  // La última fecha solo se agrega si no queda pegada a la anterior.
  return props.labels
    .map((label, index) => ({ label, index }))
    .filter(({ index }) => index % every === 0 || (index === count - 1 && index % every >= every / 2))
})

/** Etiquetas finales; si dos quedan a menos de 16px, se separan sin perder el orden. */
const endLabels = computed(() => {
  if (!showEndLabels.value || lastIndex.value < 0) return []
  const last = lastIndex.value
  const items = props.series
    .map((serie) => ({ id: serie.id, label: serie.label, color: serie.color, y: y(serie.values[last] ?? 0) }))
    .sort((a, b) => a.y - b.y)
  // Separación mínima de 16px; si se salen por abajo, se suben todas en bloque.
  for (let i = 1; i < items.length; i++) {
    if (items[i]!.y - items[i - 1]!.y < 16) items[i]!.y = items[i - 1]!.y + 16
  }
  const bottom = MARGIN.top + plotHeight
  const overflow = (items.at(-1)?.y ?? 0) - bottom
  if (overflow > 0) items.forEach((item) => (item.y -= overflow))
  return items
})

function onPointerMove(event: PointerEvent): void {
  const rect = (event.currentTarget as SVGRectElement).getBoundingClientRect()
  const relative = event.clientX - rect.left
  const count = props.labels.length
  const index = count <= 1 ? 0 : Math.round((relative / rect.width) * (count - 1))
  activeIndex.value = Math.min(count - 1, Math.max(0, index))
}

function onKeydown(event: KeyboardEvent): void {
  const count = props.labels.length
  if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
    event.preventDefault()
    const current = activeIndex.value ?? (event.key === 'ArrowRight' ? -1 : count)
    activeIndex.value = Math.min(count - 1, Math.max(0, current + (event.key === 'ArrowRight' ? 1 : -1)))
  } else if (event.key === 'Escape') {
    activeIndex.value = null
  }
}

/** Tooltip: valores de todas las series en el punto, ordenados de mayor a menor. */
const tooltip = computed(() => {
  if (activeIndex.value === null) return null
  const index = activeIndex.value
  const left = x(index)
  return {
    left,
    alignRight: left > width.value * 0.6,
    label: props.labels[index],
    rows: props.series
      .filter((serie) => serie.values[index] !== null)
      .map((serie) => ({ ...serie, value: serie.values[index] ?? 0 }))
      .sort((a, b) => b.value - a.value),
  }
})
</script>

<template>
  <div class="space-y-3">
    <!-- Leyenda: siempre con 2 o más series -->
    <ul v-if="series.length > 1" class="flex flex-wrap gap-x-4 gap-y-1 text-sm text-on-surface-variant">
      <li v-for="serie in series" :key="serie.id" class="flex items-center gap-2">
        <span class="h-0.5 w-4 rounded-full" :style="{ background: serie.color }" aria-hidden="true" />
        {{ serie.label }}
      </li>
    </ul>

    <div
      ref="container"
      class="relative outline-none focus-visible:rounded-xl focus-visible:ring-2 focus-visible:ring-primary"
      tabindex="0"
      role="img"
      :aria-label="description"
      @keydown="onKeydown"
      @blur="activeIndex = null"
    >
      <svg :width="width" :height="HEIGHT" class="block overflow-visible">
        <!-- Cuadrícula y eje Y -->
        <g>
          <template v-for="tick in yScale.ticks" :key="tick">
            <line
              :x1="MARGIN.left"
              :x2="MARGIN.left + plotWidth"
              :y1="y(tick)"
              :y2="y(tick)"
              :class="tick === 0 ? 'stroke-outline-variant' : 'stroke-outline-variant/40'"
              stroke-width="1"
            />
            <text :x="MARGIN.left - 10" :y="y(tick)" text-anchor="end" dominant-baseline="middle" class="fill-outline text-[11px] tabular-nums">
              {{ formatAxis(tick) }}
            </text>
          </template>
        </g>

        <!-- Eje X -->
        <text
          v-for="tick in xTicks"
          :key="tick.index"
          :x="x(tick.index)"
          :y="HEIGHT - 8"
          text-anchor="middle"
          class="fill-outline text-[11px]"
        >
          {{ tick.label.replace(' (en curso)', '*') }}
        </text>

        <!-- Línea guía -->
        <line
          v-if="tooltip"
          :x1="tooltip.left"
          :x2="tooltip.left"
          :y1="MARGIN.top"
          :y2="MARGIN.top + plotHeight"
          class="stroke-outline"
          stroke-width="1"
        />

        <!-- Series -->
        <path
          v-for="serie in paths"
          :key="serie.id"
          :d="serie.d"
          fill="none"
          :stroke="serie.color"
          stroke-width="2"
          stroke-linejoin="round"
          stroke-linecap="round"
        />

        <!-- Puntos: el final de cada serie y, al pasar el mouse, el punto activo -->
        <template v-for="serie in paths" :key="`dot-${serie.id}`">
          <circle
            v-if="lastIndex >= 0 && serie.values[lastIndex] !== null"
            :cx="x(lastIndex)"
            :cy="y(serie.values[lastIndex] ?? 0)"
            r="4"
            :fill="serie.color"
            class="stroke-surface-container-lowest"
            stroke-width="2"
          />
          <circle
            v-if="activeIndex !== null && serie.values[activeIndex] !== null"
            :cx="x(activeIndex)"
            :cy="y(serie.values[activeIndex] ?? 0)"
            r="5"
            :fill="serie.color"
            class="stroke-surface-container-lowest"
            stroke-width="2"
          />
        </template>

        <!-- Punto del período en curso: hueco, para leerlo como dato parcial -->
        <template v-if="partialIndex !== null && partialIndex !== undefined">
          <circle
            v-for="serie in paths.filter((item) => item.values[partialIndex!] !== null)"
            :key="`partial-${serie.id}`"
            :cx="x(partialIndex)"
            :cy="y(serie.values[partialIndex] ?? 0)"
            r="4"
            class="fill-surface-container-lowest"
            :stroke="serie.color"
            stroke-width="2"
          />
        </template>

        <!-- Etiquetas directas al final (texto en tinta, no en el color de la serie) -->
        <g v-for="item in endLabels" :key="`label-${item.id}`">
          <circle :cx="MARGIN.left + plotWidth + 12" :cy="item.y" r="3" :fill="item.color" />
          <text :x="MARGIN.left + plotWidth + 20" :y="item.y" dominant-baseline="middle" class="fill-on-surface-variant text-[11px]">
            {{ item.label.length > 14 ? `${item.label.slice(0, 13)}…` : item.label }}
          </text>
        </g>

        <!-- Área de captura del puntero (más grande que las líneas) -->
        <rect
          :x="MARGIN.left"
          :y="MARGIN.top"
          :width="plotWidth"
          :height="plotHeight"
          fill="transparent"
          @pointermove="onPointerMove"
          @pointerleave="activeIndex = null"
        />
      </svg>

      <!-- Tooltip -->
      <div
        v-if="tooltip"
        class="pointer-events-none absolute top-2 z-10 min-w-44 rounded-xl bg-surface-container-lowest px-3 py-2 text-sm shadow-lg ring-1 ring-outline-variant/50"
        :style="tooltip.alignRight ? { right: `${width - tooltip.left + 12}px` } : { left: `${tooltip.left + 12}px` }"
        role="status"
      >
        <p class="mb-1 text-xs text-on-surface-variant">{{ tooltip.label }}</p>
        <p v-if="tooltip.rows.length === 0" class="text-xs text-on-surface-variant">Sin datos todavía</p>
        <p v-for="row in tooltip.rows" :key="row.id" class="flex items-center gap-2">
          <span class="h-0.5 w-3 shrink-0 rounded-full" :style="{ background: row.color }" aria-hidden="true" />
          <strong class="font-semibold text-on-surface tabular-nums">{{ format(row.value) }}</strong>
          <span class="truncate text-xs text-on-surface-variant">{{ row.label }}</span>
        </p>
      </div>
    </div>
  </div>
</template>
