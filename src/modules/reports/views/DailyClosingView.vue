<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'

import SkeletonBlock from '@/components/base/SkeletonBlock.vue'
import SitePageHeader from '@/components/base/SitePageHeader.vue'
import { usePageTitle } from '@/composables/usePageTitle'
import { useSiteContext } from '@/composables/useSiteContext'
import { fetchAttentionsBySite } from '@/modules/orders/api'
import type { Attention } from '@/modules/orders/types'
import { fetchAllPayments, paymentMethodLabel } from '@/modules/payments/api'
import type { Payment } from '@/modules/payments/types'
import { fetchDailyClosings, saveDailyClosing } from '@/modules/reports/api'
import type { DailyClosingRecord } from '@/modules/reports/api'
import RankedBars from '@/modules/reports/components/RankedBars.vue'
import { computeDailyClosing } from '@/modules/reports/metrics'
import type { RestaurantSite } from '@/modules/restaurants/types'
import { useConfirmStore } from '@/stores/confirm'
import { useSessionStore } from '@/stores/session'
import { useToastStore } from '@/stores/toast'
import { formatMoney } from '@/utils/money'
import { formatDateTime, formatTime, localDateKey } from '@/utils/time'

usePageTitle('Cierre del día')

const confirm = useConfirmStore()

const session = useSessionStore()
const toast = useToastStore()

const attentions = ref<Attention[]>([])
const payments = ref<Payment[]>([])
const closings = ref<DailyClosingRecord[]>([])
const dateKey = ref('')
const isSaving = ref(false)
const actionError = ref<string | null>(null)

const { restaurant, currency, isLoading, loadError, reload } = useSiteContext(loadData)

async function loadData(site: RestaurantSite): Promise<void> {
  const [siteAttentions, allPayments, siteClosings] = await Promise.all([
    fetchAttentionsBySite(site.id),
    fetchAllPayments(),
    fetchDailyClosings(site.id),
  ])
  attentions.value = siteAttentions
  payments.value = allPayments
  closings.value = siteClosings

  if (!dateKey.value) {
    dateKey.value = localDateKey(new Date().toISOString(), site.timezone)
  }
}

const summary = computed(() =>
  computeDailyClosing({
    attentions: attentions.value,
    payments: payments.value,
    dateKey: dateKey.value,
    timeZone: restaurant.value?.timezone ?? 'Europe/Madrid',
  }),
)

const existingClosing = computed(() => closings.value.find((closing) => closing.dateKey === dateKey.value) ?? null)

const money = (value: number) => formatMoney(value, currency.value)

async function registerClosing(): Promise<void> {
  if (!restaurant.value) {
    return
  }

  if (
    summary.value.open > 0 &&
    !(await confirm.ask({
      title: `Quedan ${summary.value.open} mesas con la cuenta abierta`,
      message: 'Lo ideal es cobrarlas antes de cerrar el día. ¿Quieres registrar el cierre igualmente?',
      confirmLabel: 'Registrar igualmente',
    }))
  ) {
    return
  }

  isSaving.value = true
  actionError.value = null

  try {
    const saved = await saveDailyClosing(restaurant.value.id, summary.value, session.user?.name ?? null)
    closings.value = [saved, ...closings.value.filter((closing) => closing.id !== saved.id)]
    toast.show('Cierre registrado', { message: `${saved.dateKey} · ${money(saved.totalPaid)}`, tone: 'success' })
  } catch {
    actionError.value = 'No se pudo registrar el cierre.'
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div class="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 lg:px-8">
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
        section="Cierre del día"
        title="Cierre del día"
        :description="`Resumen de caja por fecha (zona horaria ${restaurant.timezone}).`"
      >
        <template #actions>
          <input
            v-model="dateKey"
            class="rounded-xl bg-surface-container-lowest px-3 py-2 text-sm text-on-surface shadow-sm outline-none ring-1 ring-transparent focus:ring-primary"
            type="date"
            aria-label="Fecha"
          />
          <button
            type="button"
            class="font-label rounded-xl bg-surface-container-lowest px-3 py-2 text-xs font-semibold text-on-surface shadow-sm hover:bg-surface-container"
            @click="reload"
          >
            Actualizar
          </button>
          <button
            type="button"
            class="font-label rounded-xl bg-primary min-h-11 px-4 py-2.5 text-sm font-semibold text-on-primary shadow-sm hover:bg-primary-container disabled:opacity-50"
            :disabled="isSaving"
            @click="registerClosing"
          >
            {{ existingClosing ? 'Actualizar cierre' : 'Registrar cierre' }}
          </button>
        </template>
      </SitePageHeader>

      <p v-if="actionError" class="rounded-lg bg-error-container px-3 py-2 text-sm text-on-error-container" role="alert">
        {{ actionError }}
      </p>

      <div
        v-if="summary.open > 0"
        class="space-y-2 rounded-2xl bg-tertiary-fixed/50 p-4 ring-1 ring-tertiary-container"
        role="alert"
      >
        <p class="text-sm font-semibold text-on-surface">Quedan {{ summary.open }} atenciones abiertas de este día:</p>
        <div class="flex flex-wrap gap-2">
          <RouterLink
            v-for="attention in summary.openAttentions"
            :key="attention.id"
            class="font-label rounded-lg bg-surface-container-lowest min-h-9 px-3 py-1.5 text-sm font-semibold text-on-surface shadow-sm hover:bg-surface-container"
            :to="{ name: 'site-account-detail', params: { restaurantId: restaurant.id, attentionId: attention.id } }"
          >
            Mesa {{ attention.tableNumber }} · {{ formatTime(attention.openedAt, restaurant.timezone) }}
          </RouterLink>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <article class="rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
          <span class="font-label text-xs font-semibold tracking-wider text-on-surface-variant uppercase">Cobrado</span>
          <p class="font-headline pt-1 text-3xl font-semibold text-on-surface tabular-nums">{{ money(summary.totalPaid) }}</p>
        </article>
        <article class="rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
          <span class="font-label text-xs font-semibold tracking-wider text-on-surface-variant uppercase">Cerradas</span>
          <p class="font-headline pt-1 text-3xl font-semibold text-on-surface tabular-nums">{{ summary.closed }}</p>
        </article>
        <article class="rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
          <span class="font-label text-xs font-semibold tracking-wider text-on-surface-variant uppercase">Abiertas</span>
          <p class="font-headline pt-1 text-3xl font-semibold tabular-nums" :class="summary.open > 0 ? 'text-error' : 'text-on-surface'">
            {{ summary.open }}
          </p>
        </article>
        <article class="rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
          <span class="font-label text-xs font-semibold tracking-wider text-on-surface-variant uppercase">Canceladas</span>
          <p class="font-headline pt-1 text-3xl font-semibold text-on-surface tabular-nums">{{ summary.cancelled }}</p>
          <p v-if="summary.pendingPayments > 0" class="mt-1 text-xs text-error">{{ summary.pendingPayments }} pagos sin confirmar</p>
        </article>
      </div>

      <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
        <section class="space-y-3 rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
          <h2 class="font-headline text-base font-semibold text-on-surface">Por método de pago</h2>
          <RankedBars
            :items="summary.byMethod.map((row) => ({ label: `${paymentMethodLabel[row.method]} (${row.count})`, value: row.amount }))"
            :format="money"
            empty-label="No hubo cobros este día."
          />
        </section>
        <section class="space-y-3 rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
          <h2 class="font-headline text-base font-semibold text-on-surface">Por empleado que cobró</h2>
          <RankedBars
            :items="summary.byEmployee.map((row) => ({ label: `${row.name} (${row.count})`, value: row.amount }))"
            :format="money"
            empty-label="No hubo cobros este día."
          />
        </section>
      </div>

      <section class="space-y-3">
        <h2 class="font-headline text-lg font-semibold text-on-surface">Cierres registrados</h2>
        <p v-if="closings.length === 0" class="text-sm text-on-surface-variant">Todavía no se registró ningún cierre.</p>
        <ul v-else class="divide-y divide-outline-variant/40 overflow-hidden rounded-2xl bg-surface-container-lowest shadow-sm">
          <li v-for="closing in closings" :key="closing.id" class="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
            <button type="button" class="font-semibold text-on-surface hover:text-primary" @click="dateKey = closing.dateKey">
              {{ closing.dateKey }}
            </button>
            <span class="text-xs text-on-surface-variant">
              {{ closing.closedAttentions }} cerradas · {{ closing.openAttentions }} abiertas ·
              por {{ closing.closedBy ?? '—' }} el {{ formatDateTime(closing.createdAt, restaurant.timezone) }}
            </span>
            <span class="font-semibold text-on-surface tabular-nums">{{ money(closing.totalPaid) }}</span>
          </li>
        </ul>
      </section>
    </template>
  </div>
</template>
