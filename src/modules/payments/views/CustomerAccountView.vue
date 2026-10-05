<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

import DinerNotice from '@/components/feedback/DinerNotice.vue'
import { usePageTitle } from '@/composables/usePageTitle'
import { usePolling } from '@/composables/usePolling'
import {
  errorMessage,
  fetchAttentionById,
  fetchOrderedProductsByAttention,
  isAttentionActive,
  requestAccount,
} from '@/modules/orders/api'
import { attentionStatusBadgeClass, attentionStatusLabel, orderedProductStatusLabel } from '@/modules/orders/order-status-labels'
import type { Attention, OrderedProduct } from '@/modules/orders/types'
import { computeAccount } from '@/modules/payments/account'
import { fetchPaymentsByAttention, paymentMethodLabel, paymentStatusBadgeClass, paymentStatusLabel } from '@/modules/payments/api'
import type { Payment } from '@/modules/payments/types'
import { fetchRestaurantById } from '@/modules/restaurants/api'
import { useDinerStore } from '@/stores/diner'
import { useToastStore } from '@/stores/toast'
import { formatMoney } from '@/utils/money'
import { formatTime } from '@/utils/time'

usePageTitle('Mi cuenta')

const route = useRoute()
const diner = useDinerStore()
const toast = useToastStore()

const attention = ref<Attention | null>(null)
const products = ref<OrderedProduct[]>([])
const payments = ref<Payment[]>([])
const currency = ref(diner.currency)
const timezone = ref<string | undefined>(undefined)
const isLoading = ref(true)
const hasConnectionError = ref(false)
const isRequesting = ref(false)
const actionError = ref<string | null>(null)

const attentionId = computed(() => (typeof route.params.attentionId === 'string' ? route.params.attentionId : null))
const account = computed(() => computeAccount(products.value, payments.value))
const discarded = computed(() => products.value.filter((product) => product.status === 'rejected' || product.status === 'cancelled'))

async function loadAccount(): Promise<void> {
  const id = attentionId.value

  if (!id) {
    isLoading.value = false
    return
  }

  try {
    const [fetchedAttention, fetchedProducts, fetchedPayments] = await Promise.all([
      fetchAttentionById(id),
      fetchOrderedProductsByAttention(id),
      fetchPaymentsByAttention(id),
    ])

    if (fetchedAttention && timezone.value === undefined) {
      const site = await fetchRestaurantById(fetchedAttention.restaurantId)
      currency.value = site?.currency ?? currency.value
      timezone.value = site?.timezone
    }

    attention.value = fetchedAttention
    products.value = fetchedProducts
    payments.value = fetchedPayments
    hasConnectionError.value = false

    if (fetchedAttention && !isAttentionActive(fetchedAttention)) {
      polling.stop()
    }
  } catch {
    hasConnectionError.value = attention.value === null
  } finally {
    isLoading.value = false
  }
}

const polling = usePolling(loadAccount, 8000)

async function askForAccount(): Promise<void> {
  if (!attention.value) {
    return
  }

  isRequesting.value = true
  actionError.value = null

  try {
    attention.value = await requestAccount(attention.value)
    toast.show('Cuenta solicitada', { message: 'El personal ya fue avisado.', tone: 'success' })
  } catch (error) {
    actionError.value = errorMessage(error, 'No se pudo solicitar la cuenta.')
  } finally {
    isRequesting.value = false
  }
}

watch(
  attentionId,
  () => {
    isLoading.value = true
    void loadAccount()
    polling.start()
  },
  { immediate: true },
)
</script>

<template>
  <div class="space-y-6 pb-8">
    <p v-if="isLoading" class="text-sm text-on-surface-variant">Cargando cuenta…</p>
    <DinerNotice v-else-if="hasConnectionError" kind="connection" @retry="loadAccount" />
    <DinerNotice v-else-if="!attention" kind="info" title="No encontramos esta cuenta" message="Puede que el enlace no sea correcto." />

    <template v-else>
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p class="font-label text-[11px] font-semibold tracking-widest text-primary uppercase">Mesa {{ attention.tableNumber }}</p>
          <h1 class="font-headline text-2xl font-semibold text-on-surface">Tu cuenta</h1>
        </div>
        <span class="font-label inline-flex rounded-lg px-3 py-1 text-xs font-semibold" :class="attentionStatusBadgeClass[attention.status]">
          {{ attentionStatusLabel[attention.status] }}
        </span>
      </div>

      <div class="grid grid-cols-3 gap-3">
        <div class="rounded-2xl bg-surface-container-lowest p-4 shadow-sm">
          <span class="font-label text-[10px] font-semibold tracking-wide text-on-surface-variant uppercase">Total</span>
          <p class="font-headline mt-1 text-lg font-semibold text-on-surface">{{ formatMoney(account.total, currency) }}</p>
        </div>
        <div class="rounded-2xl bg-surface-container-lowest p-4 shadow-sm">
          <span class="font-label text-[10px] font-semibold tracking-wide text-on-surface-variant uppercase">Pagado</span>
          <p class="font-headline mt-1 text-lg font-semibold text-emerald-700">{{ formatMoney(account.paid, currency) }}</p>
        </div>
        <div class="rounded-2xl bg-surface-container-lowest p-4 shadow-sm">
          <span class="font-label text-[10px] font-semibold tracking-wide text-on-surface-variant uppercase">Pendiente</span>
          <p class="font-headline mt-1 text-lg font-semibold" :class="account.remaining > 0 ? 'text-error' : 'text-on-surface'">
            {{ formatMoney(account.remaining, currency) }}
          </p>
        </div>
      </div>

      <section class="space-y-3 rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
        <h2 class="font-headline text-sm font-semibold text-on-surface">Consumo</h2>
        <ul class="space-y-2">
          <li v-for="item in account.products" :key="item.product.id" class="flex items-center justify-between gap-2 text-sm">
            <span class="text-on-surface">{{ item.product.quantity }}× {{ item.product.name }}</span>
            <span class="font-semibold text-on-surface">{{ formatMoney(item.product.subtotal, currency) }}</span>
          </li>
          <li v-for="product in discarded" :key="product.id" class="flex items-center justify-between gap-2 text-sm">
            <span class="text-on-surface-variant line-through">{{ product.quantity }}× {{ product.name }}</span>
            <span class="text-[11px] text-on-surface-variant">{{ orderedProductStatusLabel[product.status] }} · no se cobra</span>
          </li>
        </ul>
        <p v-if="products.length === 0" class="text-sm text-on-surface-variant">Todavía no hay consumo en esta mesa.</p>
      </section>

      <section class="space-y-3 rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
        <h2 class="font-headline text-sm font-semibold text-on-surface">Pagos registrados</h2>
        <p v-if="payments.length === 0" class="text-sm text-on-surface-variant">
          Todavía no hay pagos. El cobro lo registra el personal del restaurante.
        </p>
        <ul v-else class="space-y-2">
          <li v-for="payment in payments" :key="payment.id" class="flex items-center justify-between gap-2 text-sm">
            <span class="text-on-surface-variant">
              {{ formatTime(payment.createdAt, timezone) }} · {{ paymentMethodLabel[payment.method] }}
              <template v-if="payment.payerName"> · {{ payment.payerName }}</template>
            </span>
            <span class="flex items-center gap-2">
              <span class="font-label rounded px-1.5 py-0.5 text-[10px] font-bold uppercase" :class="paymentStatusBadgeClass[payment.status]">
                {{ paymentStatusLabel[payment.status] }}
              </span>
              <span class="font-semibold text-on-surface">{{ formatMoney(payment.amount, currency) }}</span>
            </span>
          </li>
        </ul>
      </section>

      <p v-if="actionError" class="rounded-lg bg-error-container px-3 py-2 text-xs text-on-error-container" role="alert">
        {{ actionError }}
      </p>

      <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <RouterLink
          class="font-label rounded-xl bg-surface-container-lowest py-3 text-center text-sm font-semibold text-on-surface shadow-sm hover:bg-surface-container"
          :to="{ name: 'order-status', params: { attentionId: attention.id } }"
        >
          Volver a mi pedido
        </RouterLink>
        <button
          v-if="attention.status === 'open'"
          type="button"
          class="font-label rounded-xl bg-primary py-3 text-sm font-semibold text-on-primary shadow-sm hover:bg-primary-container disabled:opacity-60"
          :disabled="isRequesting"
          @click="askForAccount"
        >
          {{ isRequesting ? 'Solicitando…' : 'Solicitar la cuenta' }}
        </button>
        <p
          v-else-if="attention.status === 'account-requested'"
          class="rounded-xl bg-tertiary-fixed px-4 py-3 text-center text-sm text-on-tertiary-container"
        >
          Cuenta solicitada: el personal vendrá a cobrarte.
        </p>
      </div>
    </template>
  </div>
</template>
