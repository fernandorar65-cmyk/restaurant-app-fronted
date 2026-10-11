<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'

import SkeletonBlock from '@/components/base/SkeletonBlock.vue'
import { usePageTitle } from '@/composables/usePageTitle'
import { fetchDailyFinancials } from '@/modules/finance/api'
import FinanceBarChart from '@/modules/finance/components/FinanceBarChart.vue'
import type { BarItem } from '@/modules/finance/components/FinanceBarChart.vue'
import FinanceLineChart from '@/modules/finance/components/FinanceLineChart.vue'
import FinancePeriodPicker from '@/modules/finance/components/FinancePeriodPicker.vue'
import type { LineSeries } from '@/modules/finance/components/FinanceLineChart.vue'
import {
  comparisonLabel,
  parseDateKey,
  periodLabel,
  periodRange,
  previousAnchor,
  sumTotals,
  timeBuckets,
  toDateKey,
} from '@/modules/finance/period'
import type { DailyFinancial, FinanceTotals } from '@/modules/finance/types'
import { useFinancePeriod } from '@/modules/finance/useFinancePeriod'
import { fetchRestaurants } from '@/modules/restaurants/api'
import type { RestaurantSite } from '@/modules/restaurants/types'
import { useSessionStore } from '@/stores/session'

usePageTitle('Finanzas')

const session = useSessionStore()

const router = useRouter()
const { period, anchor, today, periodQuery } = useFinancePeriod()
const metric = ref<'profit' | 'revenue'>('profit')

const restaurants = ref<RestaurantSite[]>([])
const selectedIds = ref<string[]>([])
const rows = ref<DailyFinancial[]>([])
const isLoading = ref(true)
const isRefreshing = ref(false)
const loadError = ref(false)

/* ── Sedes y colores ─────────────────────────────────────────────── */

/** Sedes a las que el usuario tiene acceso, en orden fijo por id. */
const accessibleSites = computed(() =>
  restaurants.value.filter((site) => session.canAccessRestaurant(site.id)).sort((a, b) => Number(a.id) - Number(b.id)),
)

/** El color sigue a la sede, no a su posición: filtrar no repinta a las demás. */
function siteColor(siteId: string): string {
  const slot = accessibleSites.value.findIndex((site) => site.id === siteId)
  return `var(--series-${(slot % 8) + 1})`
}

const selectedSites = computed(() => accessibleSites.value.filter((site) => selectedIds.value.includes(site.id)))
const currency = computed(() => selectedSites.value[0]?.currency ?? accessibleSites.value[0]?.currency ?? 'EUR')

function toggleSite(id: string): void {
  if (selectedIds.value.includes(id)) {
    // Siempre queda al menos una sede seleccionada.
    if (selectedIds.value.length > 1) selectedIds.value = selectedIds.value.filter((item) => item !== id)
  } else {
    selectedIds.value = [...selectedIds.value, id]
  }
}

function selectAll(): void {
  selectedIds.value = accessibleSites.value.map((site) => site.id)
}

const allSelected = computed(() => selectedIds.value.length === accessibleSites.value.length)

/* ── Formatos ────────────────────────────────────────────────────── */

const moneyFormat = computed(
  () => new Intl.NumberFormat('es', { style: 'currency', currency: currency.value, maximumFractionDigits: 0 }),
)
const compactFormat = computed(
  () => new Intl.NumberFormat('es', { style: 'currency', currency: currency.value, notation: 'compact', maximumFractionDigits: 1 }),
)
const integerFormat = new Intl.NumberFormat('es')
const percentFormat = new Intl.NumberFormat('es', { style: 'percent', maximumFractionDigits: 1 })

const formatMoney = (value: number) => moneyFormat.value.format(value)
const formatCompact = (value: number) => compactFormat.value.format(value)

/* ── Rangos y carga ──────────────────────────────────────────────── */

const currentRange = computed(() => periodRange(period.value, anchor.value))

/** El período en curso (mes o año actual) solo llega hasta hoy. */
const isPartial = computed(() => currentRange.value.to > today)

/**
 * Tramo con el que se compara. Si el período está en curso, se compara el mismo
 * número de días del período anterior (1–11 oct vs. 1–11 sep), no el período completo.
 */
const previousRange = computed(() => {
  const full = periodRange(period.value, previousAnchor(period.value, anchor.value))

  if (!isPartial.value) {
    return full
  }

  const elapsedDays = Math.round((parseDateKey(today).getTime() - parseDateKey(currentRange.value.from).getTime()) / 86400000)
  const end = parseDateKey(full.from)
  end.setDate(end.getDate() + elapsedDays)
  const to = toDateKey(end)
  return { from: full.from, to: to < full.to ? to : full.to }
})

const comparisonText = computed(() => {
  if (!isPartial.value) return comparisonLabel(period.value)
  return period.value === 'month' ? 'vs. mismos días del mes anterior' : 'vs. mismo tramo del año anterior'
})
const buckets = computed(() => timeBuckets(period.value, anchor.value))

/** Un solo pedido cubre el período, su comparación y la evolución. */
const fetchRange = computed(() => {
  const keys = [currentRange.value, previousRange.value, ...buckets.value]
  return { from: keys.map((range) => range.from).sort()[0]!, to: keys.map((range) => range.to).sort().at(-1)! }
})

async function load(): Promise<void> {
  const first = rows.value.length === 0
  isLoading.value = first
  isRefreshing.value = !first
  loadError.value = false

  try {
    rows.value = await fetchDailyFinancials(fetchRange.value.from, fetchRange.value.to)
  } catch {
    loadError.value = true
  } finally {
    isLoading.value = false
    isRefreshing.value = false
  }
}

watch(fetchRange, () => void load())

onMounted(async () => {
  try {
    restaurants.value = await fetchRestaurants()
    selectAll()
  } catch {
    loadError.value = true
  }

  await load()
})

/* ── Agregados ───────────────────────────────────────────────────── */

function rowsIn(range: { from: string; to: string }, siteIds: string[] = selectedIds.value): DailyFinancial[] {
  return rows.value.filter((row) => siteIds.includes(row.restaurantId) && row.date >= range.from && row.date <= range.to)
}

const currentRows = computed(() => rowsIn(currentRange.value))
const totals = computed(() => sumTotals(currentRows.value))
const previousTotals = computed(() => sumTotals(rowsIn(previousRange.value)))

/**
 * Solo se compara si el período anterior tiene datos de una cantidad parecida de días
 * (p. ej. 2025 empieza en septiembre: compararlo con un año completo engañaría).
 */
const comparable = computed(() => {
  const days = (list: DailyFinancial[]) => new Set(list.map((row) => row.date)).size
  const current = days(currentRows.value)
  return current > 0 && days(rowsIn(previousRange.value)) >= current * 0.8
})

const ticket = (value: FinanceTotals) => (value.orders > 0 ? value.revenue / value.orders : 0)
const margin = (value: FinanceTotals) => (value.revenue > 0 ? value.profit / value.revenue : 0)

function delta(current: number, previous: number): number | null {
  if (!comparable.value || previous === 0) return null
  return (current - previous) / Math.abs(previous)
}

const tiles = computed(() => [
  {
    label: 'Ingresos',
    value: formatMoney(totals.value.revenue),
    hint: `${integerFormat.format(totals.value.days)} cierres diarios`,
    delta: delta(totals.value.revenue, previousTotals.value.revenue),
  },
  {
    label: 'Ganancia neta',
    value: formatMoney(totals.value.profit),
    hint: `Margen ${percentFormat.format(margin(totals.value))}`,
    delta: delta(totals.value.profit, previousTotals.value.profit),
  },
  {
    label: 'Pedidos',
    value: integerFormat.format(totals.value.orders),
    hint: 'Tickets cobrados',
    delta: delta(totals.value.orders, previousTotals.value.orders),
  },
  {
    label: 'Ticket promedio',
    value: formatMoney(ticket(totals.value)),
    hint: 'Ingresos ÷ pedidos',
    delta: delta(ticket(totals.value), ticket(previousTotals.value)),
  },
])

/** Totales por sede, ordenados por ganancia. */
const perSite = computed(() =>
  selectedSites.value
    .map((site) => ({ site, totals: sumTotals(rowsIn(currentRange.value, [site.id])) }))
    .sort((a, b) => b.totals.profit - a.totals.profit),
)

/** Sedes seleccionadas sin ventas en el período (p. ej. inactivas): se omiten de los gráficos. */
const sitesWithoutData = computed(() => perSite.value.filter(({ totals: value }) => value.days === 0).map(({ site }) => site.name))

const barItems = computed<BarItem[]>(() =>
  perSite.value
    .filter(({ totals: value }) => value.days > 0)
    .map(({ site, totals: value }) => ({
    id: site.id,
    label: site.name,
    color: siteColor(site.id),
    value: value.profit,
    details: [
      { label: 'Ingresos', value: formatMoney(value.revenue) },
      { label: 'Costos', value: formatMoney(value.costs) },
      { label: 'Ganancia', value: formatMoney(value.profit) },
      { label: 'Margen', value: percentFormat.format(margin(value)) },
    ],
  })),
)

const lineSeries = computed<LineSeries[]>(() =>
  perSite.value
    .filter(({ totals: value }) => value.days > 0)
    .map(({ site }) => ({
      id: site.id,
      label: site.name,
      color: siteColor(site.id),
      values: buckets.value.map((bucket) => {
        // Días o meses que todavía no llegan quedan sin dato (la línea se corta).
        if (bucket.from > today) return null
        const value = sumTotals(rowsIn(bucket, [site.id]))
        return Math.round(metric.value === 'profit' ? value.profit : value.revenue)
      }),
    })),
)

const evolutionTitle = computed(() => ({ day: 'Últimos 14 días', month: 'Día a día', year: 'Mes a mes' })[period.value])

/** En la vista anual, el mes actual está incompleto: se marca para que su caída no confunda. */
const partialBucketKey = computed(() =>
  period.value === 'year' ? buckets.value.find((bucket) => bucket.from <= today && bucket.to > today)?.key ?? null : null,
)

const chartLabels = computed(() =>
  buckets.value.map((bucket) => (bucket.key === partialBucketKey.value ? `${bucket.label} (en curso)` : bucket.label)),
)

/** Detalle de ingresos y gastos de un local, con el mismo período. */
function openSite(siteId: string): void {
  void router.push({ name: 'finance-site', params: { restaurantId: siteId }, query: periodQuery() })
}
</script>

<template>
  <div class="viz-root mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
    <header class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p class="font-label text-xs font-semibold tracking-widest text-tertiary uppercase">Cadena</p>
        <h1 class="font-headline text-3xl font-semibold tracking-tight text-on-surface">Finanzas</h1>
        <p class="text-sm text-on-surface-variant first-letter:uppercase">{{ periodLabel(period, anchor) }}</p>
      </div>
    </header>

    <!-- Filtros: una sola fila, arriba de todo lo que afectan -->
    <section class="flex flex-wrap items-center gap-3" aria-label="Filtros">
      <FinancePeriodPicker v-model:period="period" v-model:anchor="anchor" />

      <div v-if="accessibleSites.length > 1" class="flex flex-wrap items-center gap-2" role="group" aria-label="Locales">
        <button
          type="button"
          class="font-label min-h-9 rounded-full px-3.5 text-sm font-semibold transition-colors"
          :class="allSelected ? 'bg-on-surface text-surface' : 'bg-surface-container-lowest text-on-surface-variant ring-1 ring-outline-variant/60 hover:bg-surface-container-low'"
          :aria-pressed="allSelected"
          @click="selectAll"
        >
          Todos
        </button>
        <button
          v-for="site in accessibleSites"
          :key="site.id"
          type="button"
          class="font-label inline-flex min-h-9 items-center gap-2 rounded-full px-3.5 text-sm font-semibold ring-1 transition-colors"
          :class="
            selectedIds.includes(site.id)
              ? 'bg-surface-container-lowest text-on-surface ring-on-surface/60'
              : 'bg-transparent text-on-surface-variant ring-outline-variant/60 opacity-60 hover:opacity-100'
          "
          :aria-pressed="selectedIds.includes(site.id)"
          @click="toggleSite(site.id)"
        >
          <span class="h-2.5 w-2.5 rounded-full" :style="{ background: siteColor(site.id) }" aria-hidden="true" />
          {{ site.name }}
        </button>
      </div>
    </section>

    <SkeletonBlock v-if="isLoading" :rows="5" />
    <p v-else-if="loadError" class="rounded-2xl bg-error-container px-4 py-3 text-sm text-on-error-container" role="alert">
      No pudimos cargar los datos financieros. Revisa tu conexión e inténtalo de nuevo.
    </p>

    <!-- Al recargar se mantiene el gráfico anterior atenuado, sin saltos -->
    <div v-else class="space-y-6 transition-opacity" :class="{ 'opacity-50': isRefreshing }">
      <!-- Indicadores -->
      <section class="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Resumen">
        <article v-for="tile in tiles" :key="tile.label" class="space-y-1 rounded-2xl bg-surface-container-lowest p-4 ring-1 ring-outline-variant/40">
          <p class="text-sm text-on-surface-variant">{{ tile.label }}</p>
          <p class="text-2xl font-semibold tracking-tight text-on-surface sm:text-3xl">{{ tile.value }}</p>
          <p class="flex flex-wrap items-center gap-x-2 text-xs">
            <span
              v-if="tile.delta !== null"
              class="inline-flex items-center gap-0.5 font-semibold"
              :class="tile.delta >= 0 ? 'text-success' : 'text-error'"
            >
              <svg class="h-3 w-3" :class="{ 'rotate-180': tile.delta < 0 }" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18" />
              </svg>
              {{ tile.delta >= 0 ? '+' : '' }}{{ percentFormat.format(tile.delta) }}
            </span>
            <span class="text-on-surface-variant">{{ tile.delta !== null ? comparisonText : tile.hint }}</span>
          </p>
        </article>
      </section>

      <p v-if="totals.days === 0" class="rounded-2xl bg-surface-container-low px-4 py-6 text-center text-sm text-on-surface-variant">
        No hay ventas registradas en este período{{ period === 'day' ? ' (el local pudo estar cerrado)' : '' }}.
      </p>

      <div class="grid gap-6 xl:grid-cols-5">
        <!-- Ganancia por local -->
        <section class="min-w-0 space-y-4 rounded-2xl bg-surface-container-lowest p-5 ring-1 ring-outline-variant/40 xl:col-span-2">
          <div>
            <h2 class="font-headline text-lg font-semibold text-on-surface">Ganancia por local</h2>
            <p class="text-sm text-on-surface-variant">Ingresos menos insumos, personal y operación. Toca un local para ver su detalle.</p>
          </div>
          <FinanceBarChart :items="barItems" :format="formatMoney" @select="openSite" />
        </section>

        <!-- Evolución -->
        <section class="min-w-0 space-y-4 rounded-2xl bg-surface-container-lowest p-5 ring-1 ring-outline-variant/40 xl:col-span-3">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 class="font-headline text-lg font-semibold text-on-surface">Evolución</h2>
              <p class="text-sm text-on-surface-variant">{{ evolutionTitle }}</p>
            </div>
            <div class="grid grid-cols-2 gap-1 rounded-xl bg-surface-container p-1" role="radiogroup" aria-label="Indicador">
              <button
                v-for="option in [
                  { value: 'profit', label: 'Ganancia' },
                  { value: 'revenue', label: 'Ingresos' },
                ] as const"
                :key="option.value"
                type="button"
                role="radio"
                :aria-checked="metric === option.value"
                class="font-label min-h-8 rounded-lg px-3 text-xs font-semibold transition-colors"
                :class="metric === option.value ? 'bg-surface-container-lowest text-on-surface shadow-sm' : 'text-on-surface-variant hover:text-on-surface'"
                @click="metric = option.value"
              >
                {{ option.label }}
              </button>
            </div>
          </div>
          <p v-if="sitesWithoutData.length > 0" class="text-xs text-on-surface-variant">
            Sin ventas en este período: {{ sitesWithoutData.join(', ') }}.
          </p>
          <FinanceLineChart
            :labels="chartLabels"
            :series="lineSeries"
            :format="formatMoney"
            :format-axis="formatCompact"
            :partial-index="partialBucketKey ? buckets.findIndex((bucket) => bucket.key === partialBucketKey) : null"
            :description="`${metric === 'profit' ? 'Ganancia' : 'Ingresos'} por local, ${evolutionTitle.toLowerCase()}. Los valores están en la tabla de detalle.`"
          />
          <p v-if="partialBucketKey" class="text-xs text-on-surface-variant">
            El mes en curso solo incluye hasta hoy, por eso se ve más bajo.
          </p>
        </section>
      </div>

      <!-- Tabla de detalle: todos los valores sin depender del gráfico -->
      <section class="space-y-3">
        <h2 class="font-headline text-lg font-semibold text-on-surface">Detalle por local</h2>
        <div class="overflow-x-auto rounded-2xl bg-surface-container-lowest ring-1 ring-outline-variant/40">
          <table class="responsive-table w-full text-sm">
            <thead class="border-b border-outline-variant/50 text-left text-xs text-on-surface-variant">
              <tr>
                <th class="px-4 py-3 font-semibold">Local</th>
                <th class="px-4 py-3 text-right font-semibold">Ingresos</th>
                <th class="px-4 py-3 text-right font-semibold">Insumos</th>
                <th class="px-4 py-3 text-right font-semibold">Personal</th>
                <th class="px-4 py-3 text-right font-semibold">Operación</th>
                <th class="px-4 py-3 text-right font-semibold">Ganancia</th>
                <th class="px-4 py-3 text-right font-semibold">Margen</th>
                <th class="px-4 py-3 text-right font-semibold">Pedidos</th>
                <th class="px-4 py-3 text-right font-semibold">Ticket prom.</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-outline-variant/40 tabular-nums">
              <tr v-for="{ site, totals: value } in perSite" :key="site.id">
                <td class="cell-main px-4 py-3">
                  <RouterLink
                    :to="{ name: 'finance-site', params: { restaurantId: site.id }, query: periodQuery() }"
                    class="flex items-center gap-2 font-semibold text-on-surface hover:text-primary hover:underline"
                  >
                    <span class="h-2.5 w-2.5 shrink-0 rounded-full" :style="{ background: siteColor(site.id) }" aria-hidden="true" />
                    {{ site.name }}
                    <span class="text-xs font-normal text-outline" aria-hidden="true">→</span>
                  </RouterLink>
                </td>
                <td data-label="Ingresos" class="px-4 py-3 text-right text-on-surface">{{ formatMoney(value.revenue) }}</td>
                <td data-label="Insumos" class="px-4 py-3 text-right text-on-surface-variant">{{ formatMoney(value.foodCost) }}</td>
                <td data-label="Personal" class="px-4 py-3 text-right text-on-surface-variant">{{ formatMoney(value.laborCost) }}</td>
                <td data-label="Operación" class="px-4 py-3 text-right text-on-surface-variant">{{ formatMoney(value.operatingCost) }}</td>
                <td data-label="Ganancia" class="px-4 py-3 text-right font-semibold" :class="value.profit < 0 ? 'text-error' : 'text-on-surface'">
                  {{ formatMoney(value.profit) }}
                </td>
                <td data-label="Margen" class="px-4 py-3 text-right text-on-surface-variant">{{ percentFormat.format(margin(value)) }}</td>
                <td data-label="Pedidos" class="px-4 py-3 text-right text-on-surface-variant">{{ integerFormat.format(value.orders) }}</td>
                <td data-label="Ticket prom." class="px-4 py-3 text-right text-on-surface-variant">{{ formatMoney(ticket(value)) }}</td>
              </tr>
              <tr v-if="perSite.length > 1" class="bg-surface-container-low font-semibold">
                <td class="cell-main px-4 py-3 text-on-surface">Total</td>
                <td data-label="Ingresos" class="px-4 py-3 text-right text-on-surface">{{ formatMoney(totals.revenue) }}</td>
                <td data-label="Insumos" class="px-4 py-3 text-right text-on-surface">{{ formatMoney(totals.foodCost) }}</td>
                <td data-label="Personal" class="px-4 py-3 text-right text-on-surface">{{ formatMoney(totals.laborCost) }}</td>
                <td data-label="Operación" class="px-4 py-3 text-right text-on-surface">{{ formatMoney(totals.operatingCost) }}</td>
                <td data-label="Ganancia" class="px-4 py-3 text-right" :class="totals.profit < 0 ? 'text-error' : 'text-on-surface'">
                  {{ formatMoney(totals.profit) }}
                </td>
                <td data-label="Margen" class="px-4 py-3 text-right text-on-surface">{{ percentFormat.format(margin(totals)) }}</td>
                <td data-label="Pedidos" class="px-4 py-3 text-right text-on-surface">{{ integerFormat.format(totals.orders) }}</td>
                <td data-label="Ticket prom." class="px-4 py-3 text-right text-on-surface">{{ formatMoney(ticket(totals)) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="text-xs text-on-surface-variant">
          Datos de demostración generados en db.json (colección <code>dailyFinancials</code>). Con el backend se calcularán desde las ventas
          y costos reales.
        </p>
      </section>
    </div>
  </div>
</template>
