<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import SitePageHeader from '@/components/base/SitePageHeader.vue'
import { useNow } from '@/composables/useNow'
import { usePageTitle } from '@/composables/usePageTitle'
import { useSiteContext } from '@/composables/useSiteContext'
import { errorMessage, fetchAllStatusHistory, fetchAttentionsWithProductsBySite, isAttentionActive } from '@/modules/orders/api'
import AccountDialog from '@/modules/orders/components/AccountDialog.vue'
import { attentionStatusBadgeClass, attentionStatusLabel } from '@/modules/orders/order-status-labels'
import type { AttentionWithProducts } from '@/modules/orders/types'
import { computeAccount } from '@/modules/payments/account'
import type { AccountSummary } from '@/modules/payments/account'
import { fetchAllPayments } from '@/modules/payments/api'
import type { Payment } from '@/modules/payments/types'
import type { RestaurantSite } from '@/modules/restaurants/types'
import { useSiteActivityStore } from '@/stores/site-activity'
import { formatMoney } from '@/utils/money'
import { formatElapsed } from '@/utils/time'

usePageTitle('Cuentas de sede')

interface AccountRow {
  attention: AttentionWithProducts
  account: AccountSummary
  /** Momento en que el comensal pidió la cuenta. */
  requestedAt: string | null
}

const route = useRoute()
const router = useRouter()
const activity = useSiteActivityStore()
const now = useNow(30000)

const attentions = ref<AttentionWithProducts[]>([])
const payments = ref<Payment[]>([])
const requestedAtById = ref<Map<string, string>>(new Map())
const showClosed = ref(false)
const actionError = ref<string | null>(null)

const { restaurant, restaurantId, currency, isLoading, loadError } = useSiteContext(loadAccounts)

async function loadAccounts(site?: RestaurantSite): Promise<void> {
  const id = site?.id ?? restaurantId.value

  if (!id) {
    return
  }

  const [siteAttentions, allPayments, history] = await Promise.all([
    fetchAttentionsWithProductsBySite(id),
    fetchAllPayments(),
    fetchAllStatusHistory(),
  ])
  const ids = new Set(siteAttentions.map((attention) => attention.id))
  const requested = new Map<string, string>()

  for (const entry of history) {
    if (entry.entityType === 'attention' && entry.toStatus === 'account-requested' && ids.has(entry.entityId)) {
      requested.set(entry.entityId, entry.changedAt)
    }
  }

  attentions.value = siteAttentions
  payments.value = allPayments.filter((payment) => ids.has(payment.attentionId))
  requestedAtById.value = requested
}

async function reload(): Promise<void> {
  try {
    await loadAccounts()
  } catch (error) {
    actionError.value = errorMessage(error, 'No se pudieron actualizar las cuentas.')
  }
}

const rows = computed<AccountRow[]>(() =>
  attentions.value.map((attention) => ({
    attention,
    account: computeAccount(
      attention.products,
      payments.value.filter((payment) => payment.attentionId === attention.id),
    ),
    requestedAt: requestedAtById.value.get(attention.id) ?? null,
  })),
)

const requestedRows = computed(() =>
  rows.value
    .filter((row) => row.attention.status === 'account-requested')
    .sort((a, b) => ((a.requestedAt ?? '') < (b.requestedAt ?? '') ? -1 : 1)),
)
const openRows = computed(() => rows.value.filter((row) => row.attention.status === 'open'))
const closedRows = computed(() => rows.value.filter((row) => !isAttentionActive(row.attention)))
const openTotal = computed(() =>
  rows.value.filter((row) => isAttentionActive(row.attention)).reduce((sum, row) => sum + row.account.remaining, 0),
)

const selectedAttention = computed(() => {
  const id = route.params.attentionId
  return typeof id === 'string' ? (attentions.value.find((attention) => attention.id === id) ?? null) : null
})

async function openAccount(attention: AttentionWithProducts): Promise<void> {
  if (restaurantId.value) {
    await router.push({ name: 'site-account-detail', params: { restaurantId: restaurantId.value, attentionId: attention.id } })
  }
}

async function closeAccountDialog(): Promise<void> {
  if (restaurantId.value) {
    await router.push({ name: 'site-accounts', params: { restaurantId: restaurantId.value } })
  }
}

async function handleChanged(): Promise<void> {
  await reload()
  void activity.refresh()
}

watch(
  () => activity.revision,
  () => void reload(),
)
</script>

<template>
  <div class="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 lg:px-8">
    <p v-if="isLoading" class="text-sm text-on-surface-variant">Cargando cuentas…</p>
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
        section="Cuentas"
        title="Cuentas y cobros"
        description="Primero las mesas que pidieron la cuenta. Registra uno o varios pagos; la cuenta se cierra sola cuando el saldo llega a cero."
      >
        <template #actions>
          <div class="rounded-xl bg-surface-container-lowest px-4 py-2.5 shadow-sm">
            <span class="font-label block text-[10px] font-semibold tracking-wider text-on-surface-variant uppercase">
              Pendiente por cobrar
            </span>
            <span class="font-headline text-lg font-semibold text-on-surface">{{ formatMoney(openTotal, currency) }}</span>
          </div>
        </template>
      </SitePageHeader>

      <p v-if="actionError" class="rounded-lg bg-error-container px-3 py-2 text-sm text-on-error-container" role="alert">
        {{ actionError }}
      </p>

      <section class="space-y-3">
        <h2 class="font-headline flex items-center gap-2 text-lg font-semibold text-on-surface">
          Cuentas solicitadas
          <span v-if="requestedRows.length > 0" class="rounded-full bg-error px-2 py-0.5 text-xs font-bold text-on-error">
            {{ requestedRows.length }}
          </span>
        </h2>
        <p v-if="requestedRows.length === 0" class="rounded-2xl bg-surface-container-lowest p-5 text-sm text-on-surface-variant shadow-sm">
          Ninguna mesa está esperando la cuenta.
        </p>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <button
            v-for="row in requestedRows"
            :key="row.attention.id"
            type="button"
            class="flex flex-col gap-2 rounded-2xl bg-tertiary-fixed/40 p-4 text-left shadow-sm ring-2 ring-tertiary-container transition-shadow hover:shadow-md"
            @click="openAccount(row.attention)"
          >
            <div class="flex items-center justify-between">
              <span class="font-headline text-base font-bold text-on-surface">Mesa {{ row.attention.tableNumber }}</span>
              <span v-if="row.requestedAt" class="font-label text-[11px] font-semibold text-on-tertiary-container">
                pidió {{ formatElapsed(row.requestedAt, now) }}
              </span>
            </div>
            <p class="text-xs text-on-surface-variant">
              Total {{ formatMoney(row.account.total, currency) }} · pagado {{ formatMoney(row.account.paid, currency) }}
            </p>
            <p class="font-headline text-xl font-semibold text-on-surface">{{ formatMoney(row.account.remaining, currency) }}</p>
          </button>
        </div>
      </section>

      <section class="space-y-3">
        <h2 class="font-headline text-lg font-semibold text-on-surface">Mesas con cuenta abierta</h2>
        <p v-if="openRows.length === 0" class="text-sm text-on-surface-variant">No hay otras cuentas abiertas.</p>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <button
            v-for="row in openRows"
            :key="row.attention.id"
            type="button"
            class="flex flex-col gap-2 rounded-2xl bg-surface-container-lowest p-4 text-left shadow-sm transition-shadow hover:shadow-md"
            @click="openAccount(row.attention)"
          >
            <div class="flex items-center justify-between">
              <span class="font-headline text-sm font-bold text-on-surface">Mesa {{ row.attention.tableNumber }}</span>
              <span class="text-xs text-on-surface-variant">{{ row.attention.products.length }} productos</span>
            </div>
            <p class="font-headline text-lg font-semibold text-on-surface">{{ formatMoney(row.account.remaining, currency) }}</p>
            <p v-if="row.account.paid > 0" class="text-xs text-emerald-700">Pagado {{ formatMoney(row.account.paid, currency) }}</p>
          </button>
        </div>
      </section>

      <section class="space-y-3">
        <button
          type="button"
          class="font-label rounded-full px-3 py-1.5 text-[11px] font-semibold"
          :class="showClosed ? 'bg-primary-container text-on-primary-container' : 'bg-surface-container text-on-surface-variant'"
          @click="showClosed = !showClosed"
        >
          {{ showClosed ? 'Ocultar cerradas y canceladas' : `Ver cerradas y canceladas (${closedRows.length})` }}
        </button>
        <div v-if="showClosed" class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <button
            v-for="row in closedRows"
            :key="row.attention.id"
            type="button"
            class="flex items-center justify-between gap-2 rounded-xl bg-surface-container-lowest p-3 text-left shadow-sm hover:shadow-md"
            @click="openAccount(row.attention)"
          >
            <span class="text-sm font-semibold text-on-surface">Mesa {{ row.attention.tableNumber }}</span>
            <span class="font-label rounded-lg px-2 py-0.5 text-[10px] font-semibold" :class="attentionStatusBadgeClass[row.attention.status]">
              {{ attentionStatusLabel[row.attention.status] }}
            </span>
            <span class="text-sm font-semibold text-on-surface">{{ formatMoney(row.account.paid, currency) }}</span>
          </button>
        </div>
      </section>

      <AccountDialog
        v-if="selectedAttention"
        :key="selectedAttention.id"
        :attention="selectedAttention"
        :products="selectedAttention.products"
        :currency="currency"
        :timezone="restaurant.timezone"
        @close="closeAccountDialog"
        @changed="handleChanged"
      />
    </template>
  </div>
</template>
