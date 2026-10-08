<script setup lang="ts">
import { computed, ref } from 'vue'

import SkeletonBlock from '@/components/base/SkeletonBlock.vue'
import SitePageHeader from '@/components/base/SitePageHeader.vue'
import { usePageTitle } from '@/composables/usePageTitle'
import { useSiteContext } from '@/composables/useSiteContext'
import { fetchAllStatusHistory, fetchAttentionsBySite, fetchOrderedProductsBySite } from '@/modules/orders/api'
import type { Attention, OrderedProduct, StatusHistoryEntry } from '@/modules/orders/types'
import { fetchAllPayments } from '@/modules/payments/api'
import type { Payment } from '@/modules/payments/types'
import RankedBars from '@/modules/reports/components/RankedBars.vue'
import { computeSiteMetrics } from '@/modules/reports/metrics'
import type { MetricsPeriod } from '@/modules/reports/metrics'
import type { RestaurantSite } from '@/modules/restaurants/types'
import { formatMoney } from '@/utils/money'

usePageTitle('Métricas')

const attentions = ref<Attention[]>([])
const products = ref<OrderedProduct[]>([])
const history = ref<StatusHistoryEntry[]>([])
const payments = ref<Payment[]>([])
const period = ref<MetricsPeriod>('week')

const { restaurant, currency, isLoading, loadError, reload } = useSiteContext(loadData)

async function loadData(site: RestaurantSite): Promise<void> {
  const [siteAttentions, siteProducts, allHistory, allPayments] = await Promise.all([
    fetchAttentionsBySite(site.id),
    fetchOrderedProductsBySite(site.id),
    fetchAllStatusHistory(),
    fetchAllPayments(),
  ])
  attentions.value = siteAttentions
  products.value = siteProducts
  history.value = allHistory
  payments.value = allPayments
}

const metrics = computed(() =>
  computeSiteMetrics({
    attentions: attentions.value,
    products: products.value,
    history: history.value,
    payments: payments.value,
    period: period.value,
    timeZone: restaurant.value?.timezone ?? 'Europe/Madrid',
  }),
)

const PERIODS: Array<{ id: MetricsPeriod; label: string }> = [
  { id: 'today', label: 'Hoy' },
  { id: 'week', label: 'Últimos 7 días' },
  { id: 'all', label: 'Todo' },
]

function minutes(value: number | null): string {
  return value === null ? '—' : `${value} min`
}

const timeTiles = computed(() => [
  { label: 'Pedido → confirmación', value: minutes(metrics.value.minutesToConfirm) },
  { label: 'Confirmación → listo', value: minutes(metrics.value.minutesToReady) },
  { label: 'Listo → entregado', value: minutes(metrics.value.minutesToDeliver) },
  { label: 'Pedido → entrega (total)', value: minutes(metrics.value.minutesEndToEnd) },
])
</script>

<template>
  <div class="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 lg:px-8">
    <SkeletonBlock v-if="isLoading" variant="page" />
    <p
      v-else-if="loadError"
      class="rounded-lg border border-error-container bg-error-container px-3 py-2 text-sm text-on-error-container"
      role="alert"
    >
      {{ loadError }}
    </p>

    <template v-else-if="restaurant">
      <SitePageHeader
        :restaurant="restaurant"
        section="Métricas"
        title="Métricas operativas"
        description="Tiempos de servicio, ventas y comportamiento de la carta, calculados con los pedidos registrados."
      >
        <template #actions>
          <div class="flex gap-1 rounded-xl bg-surface-container p-1" role="group" aria-label="Período">
            <button
              v-for="option in PERIODS"
              :key="option.id"
              type="button"
              class="font-label rounded-lg min-h-9 px-3 py-1.5 text-sm font-semibold"
              :class="period === option.id ? 'bg-surface-container-lowest text-on-surface shadow-sm' : 'text-on-surface-variant'"
              :aria-pressed="period === option.id"
              @click="period = option.id"
            >
              {{ option.label }}
            </button>
          </div>
          <button
            type="button"
            class="font-label rounded-xl bg-surface-container-lowest px-3 py-2 text-xs font-semibold text-on-surface shadow-sm hover:bg-surface-container"
            @click="reload"
          >
            Actualizar
          </button>
        </template>
      </SitePageHeader>

      <section class="space-y-3">
        <h2 class="font-headline text-lg font-semibold text-on-surface">Tiempos promedio</h2>
        <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <article v-for="tile in timeTiles" :key="tile.label" class="rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
            <span class="font-label text-xs font-semibold tracking-wider text-on-surface-variant uppercase">{{ tile.label }}</span>
            <p class="font-headline pt-1 text-3xl font-semibold text-on-surface tabular-nums">{{ tile.value }}</p>
          </article>
        </div>
      </section>

      <section class="space-y-3">
        <h2 class="font-headline text-lg font-semibold text-on-surface">Ventas y mesas</h2>
        <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <article class="rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
            <span class="font-label text-xs font-semibold tracking-wider text-on-surface-variant uppercase">Ventas cobradas</span>
            <p class="font-headline pt-1 text-3xl font-semibold text-on-surface tabular-nums">{{ formatMoney(metrics.sales, currency) }}</p>
            <p class="mt-1 text-xs text-on-surface-variant">{{ metrics.attentionsClosed }} cuentas cerradas</p>
          </article>
          <article class="rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
            <span class="font-label text-xs font-semibold tracking-wider text-on-surface-variant uppercase">Ticket promedio</span>
            <p class="font-headline pt-1 text-3xl font-semibold text-on-surface tabular-nums">
              {{ metrics.averageTicket === null ? '—' : formatMoney(metrics.averageTicket, currency) }}
            </p>
          </article>
          <article class="rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
            <span class="font-label text-xs font-semibold tracking-wider text-on-surface-variant uppercase">Duración de una atención</span>
            <p class="font-headline pt-1 text-3xl font-semibold text-on-surface tabular-nums">{{ minutes(metrics.averageAttentionMinutes) }}</p>
            <p class="mt-1 text-xs text-on-surface-variant">{{ metrics.attentionsCancelled }} canceladas</p>
          </article>
          <article class="rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
            <span class="font-label text-xs font-semibold tracking-wider text-on-surface-variant uppercase">Rotación de mesas</span>
            <p class="font-headline pt-1 text-3xl font-semibold text-on-surface tabular-nums">
              {{ metrics.tableTurnover === null ? '—' : metrics.tableTurnover }}
            </p>
            <p class="mt-1 text-xs text-on-surface-variant">cuentas cerradas por mesa usada</p>
          </article>
        </div>
      </section>

      <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section class="space-y-3 rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
          <h2 class="font-headline text-base font-semibold text-on-surface">Más pedidos (unidades)</h2>
          <RankedBars :items="metrics.topProducts" unit="uds" />
        </section>
        <section class="space-y-3 rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
          <h2 class="font-headline text-base font-semibold text-on-surface">Más rechazados</h2>
          <RankedBars :items="metrics.rejectedProducts" unit="uds" empty-label="Ningún producto rechazado en este período." />
        </section>
        <section class="space-y-3 rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
          <h2 class="font-headline text-base font-semibold text-on-surface">Origen de los pedidos</h2>
          <p class="font-headline text-4xl font-semibold text-on-surface tabular-nums">
            {{ metrics.qrShare === null ? '—' : `${metrics.qrShare}%` }}
          </p>
          <p class="text-sm text-on-surface-variant">de los productos se pidieron por QR.</p>
          <RankedBars
            :items="[
              { label: 'Por QR (comensal)', value: metrics.qrCount },
              { label: 'Manual (personal)', value: metrics.manualCount },
            ]"
            unit="productos"
          />
        </section>
      </div>
    </template>
  </div>
</template>
