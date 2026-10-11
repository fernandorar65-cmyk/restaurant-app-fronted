<script setup lang="ts">
import { computed, onMounted, ref, watch, watchEffect } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import SkeletonBlock from '@/components/base/SkeletonBlock.vue'
import { usePageTitle } from '@/composables/usePageTitle'
import { fetchDailyFinancials } from '@/modules/finance/api'
import FinanceLineChart from '@/modules/finance/components/FinanceLineChart.vue'
import type { LineSeries } from '@/modules/finance/components/FinanceLineChart.vue'
import FinancePeriodPicker from '@/modules/finance/components/FinancePeriodPicker.vue'
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
import type { DailyFinancial, FinanceTotals, RevenueByMethod } from '@/modules/finance/types'
import { useFinancePeriod } from '@/modules/finance/useFinancePeriod'
import { paymentMethodLabel } from '@/modules/payments/api'
import { fetchRestaurants } from '@/modules/restaurants/api'
import type { RestaurantSite } from '@/modules/restaurants/types'
import { useSessionStore } from '@/stores/session'

const route = useRoute()
const router = useRouter()
const session = useSessionStore()
const { period, anchor, today, periodQuery } = useFinancePeriod()

const restaurants = ref<RestaurantSite[]>([])
const rows = ref<DailyFinancial[]>([])
const isLoading = ref(true)
const isRefreshing = ref(false)
const loadError = ref(false)

const siteId = computed(() => String(route.params.restaurantId ?? ''))
const accessibleSites = computed(() =>
  restaurants.value.filter((site) => session.canAccessRestaurant(site.id)).sort((a, b) => Number(a.id) - Number(b.id)),
)
const site = computed(() => accessibleSites.value.find((item) => item.id === siteId.value) ?? null)
const currency = computed(() => site.value?.currency ?? 'EUR')

watchEffect(() => usePageTitle(site.value ? `Finanzas · ${site.value.name}` : 'Finanzas'))

function changeSite(event: Event): void {
  const next = (event.target as HTMLSelectElement).value
  void router.replace({ name: 'finance-site', params: { restaurantId: next }, query: periodQuery() })
}

/* ── Formatos ────────────────────────────────────────────────────── */

const moneyFormat = computed(() => new Intl.NumberFormat('es', { style: 'currency', currency: currency.value, maximumFractionDigits: 0 }))
const compactFormat = computed(
  () => new Intl.NumberFormat('es', { style: 'currency', currency: currency.value, notation: 'compact', maximumFractionDigits: 1 }),
)
const integerFormat = new Intl.NumberFormat('es')
const percentFormat = new Intl.NumberFormat('es', { style: 'percent', maximumFractionDigits: 1 })
const formatMoney = (value: number) => moneyFormat.value.format(value)
const formatCompact = (value: number) => compactFormat.value.format(value)

/* ── Rangos y carga ──────────────────────────────────────────────── */

const currentRange = computed(() => periodRange(period.value, anchor.value))
const isPartial = computed(() => currentRange.value.to > today)

/** Mismo criterio que el resumen: un período en curso se compara con el mismo tramo del anterior. */
const previousRange = computed(() => {
  const full = periodRange(period.value, previousAnchor(period.value, anchor.value))
  if (!isPartial.value) return full
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

const fetchRange = computed(() => {
  const ranges = [currentRange.value, previousRange.value, ...buckets.value]
  return { from: ranges.map((range) => range.from).sort()[0]!, to: ranges.map((range) => range.to).sort().at(-1)! }
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
  } catch {
    loadError.value = true
  }
  await load()
})

/* ── Agregados del local ─────────────────────────────────────────── */

function rowsIn(range: { from: string; to: string }): DailyFinancial[] {
  return rows.value.filter((row) => row.restaurantId === siteId.value && row.date >= range.from && row.date <= range.to)
}

const currentRows = computed(() => rowsIn(currentRange.value))
const totals = computed(() => sumTotals(currentRows.value))
const previousTotals = computed(() => sumTotals(rowsIn(previousRange.value)))

const comparable = computed(() => {
  const days = (list: DailyFinancial[]) => new Set(list.map((row) => row.date)).size
  const current = days(currentRows.value)
  return current > 0 && days(rowsIn(previousRange.value)) >= current * 0.8
})

function delta(current: number, previous: number): number | null {
  if (!comparable.value || previous === 0) return null
  return (current - previous) / Math.abs(previous)
}

const ticket = (value: FinanceTotals) => (value.orders > 0 ? value.revenue / value.orders : 0)
const share = (part: number) => (totals.value.revenue > 0 ? part / totals.value.revenue : 0)

/** En gastos, subir es malo: el color de la variación se invierte. */
const tiles = computed(() => [
  { label: 'Ingresos', value: formatMoney(totals.value.revenue), delta: delta(totals.value.revenue, previousTotals.value.revenue), upIsGood: true, hint: `${totals.value.days} días con ventas` },
  { label: 'Gastos', value: formatMoney(totals.value.costs), delta: delta(totals.value.costs, previousTotals.value.costs), upIsGood: false, hint: `${percentFormat.format(share(totals.value.costs))} de los ingresos` },
  { label: 'Ganancia neta', value: formatMoney(totals.value.profit), delta: delta(totals.value.profit, previousTotals.value.profit), upIsGood: true, hint: `Margen ${percentFormat.format(share(totals.value.profit))}` },
  { label: 'Ticket promedio', value: formatMoney(ticket(totals.value)), delta: delta(ticket(totals.value), ticket(previousTotals.value)), upIsGood: true, hint: `${integerFormat.format(totals.value.orders)} pedidos` },
  {
    label: 'Comensales',
    value: integerFormat.format(totals.value.guests),
    delta: delta(totals.value.guests, previousTotals.value.guests),
    upIsGood: true,
    hint: `${formatMoney(totals.value.guests > 0 ? totals.value.revenue / totals.value.guests : 0)} por comensal`,
  },
])

/* ── Gastos ──────────────────────────────────────────────────────── */

const EXPENSE_CATEGORIES = [
  { key: 'food', label: 'Insumos', hint: 'Alimentos y bebidas' },
  { key: 'labor', label: 'Personal', hint: 'Sueldos y cargas' },
  { key: 'rent', label: 'Alquiler', hint: 'Local' },
  { key: 'utilities', label: 'Servicios', hint: 'Luz, agua, gas, internet' },
  { key: 'maintenance', label: 'Mantenimiento', hint: 'Equipos y reparaciones' },
  { key: 'marketing', label: 'Marketing', hint: 'Publicidad y promociones' },
  { key: 'other', label: 'Otros', hint: 'Gastos varios' },
] as const

function expenseValue(value: FinanceTotals, key: (typeof EXPENSE_CATEGORIES)[number]['key']): number {
  if (key === 'food') return value.foodCost
  if (key === 'labor') return value.laborCost
  return value.expenses[key]
}

const expenses = computed(() =>
  EXPENSE_CATEGORIES.map((category) => {
    const amount = expenseValue(totals.value, category.key)
    return {
      ...category,
      amount,
      ofRevenue: share(amount),
      ofCosts: totals.value.costs > 0 ? amount / totals.value.costs : 0,
      delta: delta(amount, expenseValue(previousTotals.value, category.key)),
    }
  }).sort((a, b) => b.amount - a.amount),
)

const maxExpense = computed(() => Math.max(1, ...expenses.value.map((item) => item.amount)))

/**
 * Cascada de ingresos a ganancia: cada gasto resta desde el total acumulado.
 * Las posiciones están en % del ingreso (o de la escala, si hay pérdida).
 */
const waterfall = computed(() => {
  const revenue = totals.value.revenue
  const scale = Math.max(revenue, revenue - Math.min(0, totals.value.profit), 1)
  let running = revenue
  const steps = expenses.value.map((item) => {
    const start = running
    running -= item.amount
    return { key: item.key, label: item.label, amount: -item.amount, left: (Math.max(0, running) / scale) * 100, width: (item.amount / scale) * 100, start }
  })
  return {
    revenue: { width: (revenue / scale) * 100 },
    steps,
    profit: { value: totals.value.profit, width: (Math.abs(totals.value.profit) / scale) * 100 },
  }
})

/* ── Ingresos por método de pago ─────────────────────────────────── */

const METHOD_ORDER: Array<keyof RevenueByMethod> = ['card', 'yape', 'plin', 'transfer', 'cash']

const methods = computed(() =>
  METHOD_ORDER.map((key, index) => ({
    key,
    label: paymentMethodLabel[key],
    color: `var(--series-${index + 1})`,
    amount: totals.value.byMethod[key],
    share: share(totals.value.byMethod[key]),
  })).filter((item) => item.amount > 0),
)

/* ── Evolución y detalle por fecha ───────────────────────────────── */

const partialKey = computed(() =>
  period.value === 'year' ? buckets.value.find((bucket) => bucket.from <= today && bucket.to > today)?.key ?? null : null,
)

const lineSeries = computed<LineSeries[]>(() => {
  const point = (pick: (value: FinanceTotals) => number) =>
    buckets.value.map((bucket) => (bucket.from > today ? null : Math.round(pick(sumTotals(rowsIn(bucket))))))
  return [
    { id: 'revenue', label: 'Ingresos', color: 'var(--series-1)', values: point((value) => value.revenue) },
    { id: 'costs', label: 'Gastos', color: 'var(--series-2)', values: point((value) => value.costs) },
    { id: 'profit', label: 'Ganancia', color: 'var(--series-3)', values: point((value) => value.profit) },
  ]
})

const chartLabels = computed(() => buckets.value.map((bucket) => (bucket.key === partialKey.value ? `${bucket.label} (en curso)` : bucket.label)))

/** Una fila por día (o por mes en la vista anual), de la más reciente a la más antigua. */
const breakdown = computed(() =>
  buckets.value
    .filter((bucket) => bucket.from <= today)
    .map((bucket) => ({ bucket, totals: sumTotals(rowsIn(bucket)) }))
    .reverse(),
)

const dateLabel = (key: string) =>
  period.value === 'year'
    ? new Intl.DateTimeFormat('es', { month: 'long' }).format(parseDateKey(`${key}-01`))
    : new Intl.DateTimeFormat('es', { weekday: 'short', day: 'numeric', month: 'short' }).format(parseDateKey(key))
</script>

<template>
  <div class="viz-root mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
    <header class="space-y-3">
      <RouterLink :to="{ name: 'finance', query: periodQuery() }" class="font-label inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
        <span aria-hidden="true">←</span> Finanzas
      </RouterLink>
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div class="min-w-0">
          <p class="font-label text-xs font-semibold tracking-widest text-tertiary uppercase">Detalle del local</p>
          <h1 class="font-headline truncate text-3xl font-semibold tracking-tight text-on-surface">{{ site?.name ?? 'Local' }}</h1>
          <p class="text-sm text-on-surface-variant first-letter:uppercase">{{ periodLabel(period, anchor) }}</p>
        </div>
        <label v-if="accessibleSites.length > 1" class="flex items-center gap-2 text-sm text-on-surface-variant">
          Local
          <select
            :value="siteId"
            class="min-h-10 rounded-xl bg-surface-container-lowest px-3 text-sm font-semibold text-on-surface ring-1 ring-outline-variant/60 outline-none focus:ring-2 focus:ring-primary"
            @change="changeSite"
          >
            <option v-for="item in accessibleSites" :key="item.id" :value="item.id">{{ item.name }}</option>
          </select>
        </label>
      </div>
    </header>

    <FinancePeriodPicker v-model:period="period" v-model:anchor="anchor" />

    <SkeletonBlock v-if="isLoading" :rows="5" />
    <p v-else-if="loadError" class="rounded-2xl bg-error-container px-4 py-3 text-sm text-on-error-container" role="alert">
      No pudimos cargar los datos financieros. Revisa tu conexión e inténtalo de nuevo.
    </p>

    <div v-else class="space-y-6 transition-opacity" :class="{ 'opacity-50': isRefreshing }">
      <!-- Indicadores -->
      <section class="grid grid-cols-2 gap-3 lg:grid-cols-5" aria-label="Resumen">
        <article v-for="tile in tiles" :key="tile.label" class="space-y-1 rounded-2xl bg-surface-container-lowest p-4 ring-1 ring-outline-variant/40">
          <p class="text-sm text-on-surface-variant">{{ tile.label }}</p>
          <p class="text-2xl font-semibold tracking-tight text-on-surface">{{ tile.value }}</p>
          <p class="flex flex-wrap items-center gap-x-2 text-xs">
            <span
              v-if="tile.delta !== null"
              class="inline-flex items-center gap-0.5 font-semibold"
              :class="tile.delta >= 0 === tile.upIsGood ? 'text-success' : 'text-error'"
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

      <template v-else>
        <div class="grid gap-6 xl:grid-cols-2">
          <!-- Cascada: de ingresos a ganancia -->
          <section class="min-w-0 space-y-4 rounded-2xl bg-surface-container-lowest p-5 ring-1 ring-outline-variant/40">
            <div>
              <h2 class="font-headline text-lg font-semibold text-on-surface">De ingresos a ganancia</h2>
              <p class="text-sm text-on-surface-variant">Cada gasto descuenta del total hasta llegar a la ganancia.</p>
            </div>
            <ul class="space-y-1.5 text-sm">
              <li class="grid grid-cols-[8rem_1fr_5.5rem] items-center gap-3">
                <span class="font-semibold text-on-surface">Ingresos</span>
                <span class="relative h-5">
                  <span class="absolute inset-y-0 left-0 rounded-r-[4px]" :style="{ width: `${waterfall.revenue.width}%`, background: 'var(--series-1)' }" />
                </span>
                <span class="text-right font-semibold text-on-surface tabular-nums">{{ formatMoney(totals.revenue) }}</span>
              </li>
              <li v-for="step in waterfall.steps" :key="step.key" class="grid grid-cols-[8rem_1fr_5.5rem] items-center gap-3">
                <span class="truncate text-on-surface-variant">− {{ step.label }}</span>
                <span class="relative h-5">
                  <span
                    class="absolute inset-y-0.5 rounded-[3px] bg-on-surface-variant/35"
                    :style="{ left: `${step.left}%`, width: `${Math.max(step.width, 0.6)}%` }"
                  />
                </span>
                <span class="text-right text-on-surface-variant tabular-nums">{{ formatMoney(step.amount) }}</span>
              </li>
              <li class="grid grid-cols-[8rem_1fr_5.5rem] items-center gap-3 border-t border-outline-variant/50 pt-2">
                <span class="font-semibold text-on-surface">Ganancia</span>
                <span class="relative h-5">
                  <span
                    class="absolute inset-y-0 left-0 rounded-r-[4px]"
                    :style="{ width: `${waterfall.profit.width}%`, background: waterfall.profit.value >= 0 ? 'var(--series-3)' : 'var(--color-error)' }"
                  />
                </span>
                <span class="text-right font-semibold tabular-nums" :class="waterfall.profit.value < 0 ? 'text-error' : 'text-on-surface'">
                  {{ formatMoney(waterfall.profit.value) }}
                </span>
              </li>
            </ul>
          </section>

          <!-- Ingresos por método de pago -->
          <section class="min-w-0 space-y-4 rounded-2xl bg-surface-container-lowest p-5 ring-1 ring-outline-variant/40">
            <div>
              <h2 class="font-headline text-lg font-semibold text-on-surface">Ingresos por método de pago</h2>
              <p class="text-sm text-on-surface-variant">Cómo te pagaron los clientes en este período.</p>
            </div>
            <!-- Barra 100% con separación de 2px entre segmentos -->
            <div class="flex h-6 gap-0.5 overflow-hidden rounded-[4px]" role="img" :aria-label="methods.map((item) => `${item.label} ${percentFormat.format(item.share)}`).join(', ')">
              <span v-for="item in methods" :key="item.key" class="h-full first:rounded-l-[4px] last:rounded-r-[4px]" :style="{ width: `${item.share * 100}%`, background: item.color }" :title="`${item.label}: ${formatMoney(item.amount)}`" />
            </div>
            <ul class="divide-y divide-outline-variant/40 text-sm">
              <li v-for="item in methods" :key="item.key" class="flex items-center justify-between gap-3 py-2">
                <span class="flex items-center gap-2 text-on-surface">
                  <span class="h-2.5 w-2.5 rounded-sm" :style="{ background: item.color }" aria-hidden="true" />
                  {{ item.label }}
                </span>
                <span class="flex items-baseline gap-3 tabular-nums">
                  <span class="font-semibold text-on-surface">{{ formatMoney(item.amount) }}</span>
                  <span class="w-12 text-right text-xs text-on-surface-variant">{{ percentFormat.format(item.share) }}</span>
                </span>
              </li>
            </ul>
          </section>
        </div>

        <!-- Gastos por categoría -->
        <section class="space-y-4 rounded-2xl bg-surface-container-lowest p-5 ring-1 ring-outline-variant/40">
          <div class="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h2 class="font-headline text-lg font-semibold text-on-surface">Gastos por categoría</h2>
              <p class="text-sm text-on-surface-variant">
                Total {{ formatMoney(totals.costs) }} · {{ percentFormat.format(share(totals.costs)) }} de los ingresos
              </p>
            </div>
          </div>
          <ul class="divide-y divide-outline-variant/40">
            <li v-for="item in expenses" :key="item.key" class="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 py-3 sm:grid-cols-[11rem_1fr_7rem_6rem_7rem]">
              <span class="min-w-0">
                <span class="block font-semibold text-on-surface">{{ item.label }}</span>
                <span class="block truncate text-xs text-on-surface-variant">{{ item.hint }}</span>
              </span>
              <span class="order-last col-span-2 h-2 rounded-full bg-surface-container sm:order-none sm:col-span-1" aria-hidden="true">
                <span class="block h-full rounded-full" :style="{ width: `${(item.amount / maxExpense) * 100}%`, background: 'var(--series-2)' }" />
              </span>
              <span class="text-right font-semibold text-on-surface tabular-nums">{{ formatMoney(item.amount) }}</span>
              <span class="hidden text-right text-sm text-on-surface-variant tabular-nums sm:block" :title="'Porcentaje de los ingresos'">
                {{ percentFormat.format(item.ofRevenue) }}
              </span>
              <span class="hidden text-right text-xs sm:block">
                <span v-if="item.delta !== null" class="font-semibold" :class="item.delta <= 0 ? 'text-success' : 'text-error'">
                  {{ item.delta >= 0 ? '+' : '' }}{{ percentFormat.format(item.delta) }}
                </span>
                <span v-else class="text-outline">—</span>
              </span>
            </li>
          </ul>
          <p class="text-xs text-on-surface-variant">Porcentaje = parte de los ingresos. Variación {{ comparisonText }} (bajar un gasto se marca en verde).</p>
        </section>

        <!-- Evolución -->
        <section class="min-w-0 space-y-4 rounded-2xl bg-surface-container-lowest p-5 ring-1 ring-outline-variant/40">
          <div>
            <h2 class="font-headline text-lg font-semibold text-on-surface">Ingresos, gastos y ganancia</h2>
            <p class="text-sm text-on-surface-variant">{{ { day: 'Últimos 14 días', month: 'Día a día', year: 'Mes a mes' }[period] }}</p>
          </div>
          <FinanceLineChart
            :labels="chartLabels"
            :series="lineSeries"
            :format="formatMoney"
            :format-axis="formatCompact"
            :partial-index="partialKey ? buckets.findIndex((bucket) => bucket.key === partialKey) : null"
            :description="`Ingresos, gastos y ganancia de ${site?.name ?? 'el local'}. Los valores están en la tabla de abajo.`"
          />
          <p v-if="partialKey" class="text-xs text-on-surface-variant">El mes en curso solo incluye hasta hoy, por eso se ve más bajo.</p>
        </section>

        <!-- Detalle por fecha -->
        <section class="space-y-3">
          <h2 class="font-headline text-lg font-semibold text-on-surface">Detalle {{ period === 'year' ? 'por mes' : 'por día' }}</h2>
          <div class="overflow-x-auto rounded-2xl bg-surface-container-lowest ring-1 ring-outline-variant/40">
            <table class="responsive-table w-full text-sm">
              <thead class="border-b border-outline-variant/50 text-left text-xs text-on-surface-variant">
                <tr>
                  <th class="px-4 py-3 font-semibold">{{ period === 'year' ? 'Mes' : 'Fecha' }}</th>
                  <th class="px-4 py-3 text-right font-semibold">Ingresos</th>
                  <th class="px-4 py-3 text-right font-semibold">Insumos</th>
                  <th class="px-4 py-3 text-right font-semibold">Personal</th>
                  <th class="px-4 py-3 text-right font-semibold">Operación</th>
                  <th class="px-4 py-3 text-right font-semibold">Ganancia</th>
                  <th class="px-4 py-3 text-right font-semibold">Pedidos</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-outline-variant/40 tabular-nums">
                <tr v-for="{ bucket, totals: value } in breakdown" :key="bucket.key">
                  <td class="cell-main px-4 py-3 font-semibold text-on-surface first-letter:uppercase">{{ dateLabel(bucket.key) }}</td>
                  <template v-if="value.days > 0">
                    <td data-label="Ingresos" class="px-4 py-3 text-right text-on-surface">{{ formatMoney(value.revenue) }}</td>
                    <td data-label="Insumos" class="px-4 py-3 text-right text-on-surface-variant">{{ formatMoney(value.foodCost) }}</td>
                    <td data-label="Personal" class="px-4 py-3 text-right text-on-surface-variant">{{ formatMoney(value.laborCost) }}</td>
                    <td data-label="Operación" class="px-4 py-3 text-right text-on-surface-variant">{{ formatMoney(value.operatingCost) }}</td>
                    <td data-label="Ganancia" class="px-4 py-3 text-right font-semibold" :class="value.profit < 0 ? 'text-error' : 'text-on-surface'">
                      {{ formatMoney(value.profit) }}
                    </td>
                    <td data-label="Pedidos" class="px-4 py-3 text-right text-on-surface-variant">{{ integerFormat.format(value.orders) }}</td>
                  </template>
                  <td v-else colspan="6" data-label="Estado" class="px-4 py-3 text-right text-on-surface-variant italic">Cerrado / sin ventas</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </template>
    </div>
  </div>
</template>
