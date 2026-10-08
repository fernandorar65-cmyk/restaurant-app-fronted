<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import BaseButton from '@/components/base/BaseButton.vue'
import SkeletonBlock from '@/components/base/SkeletonBlock.vue'
import StatusBadge from '@/components/base/StatusBadge.vue'
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
import { attentionStatusLabel, attentionStatusTone, orderedProductStatusLabel } from '@/modules/orders/order-status-labels'
import type { Attention, OrderedProduct } from '@/modules/orders/types'
import { computeAccount } from '@/modules/payments/account'
import { fetchPaymentsByAttention, paymentMethodLabel, paymentStatusLabel, paymentStatusTone } from '@/modules/payments/api'
import type { Payment } from '@/modules/payments/types'
import { fetchRestaurantById } from '@/modules/restaurants/api'
import { useConfirmStore } from '@/stores/confirm'
import { useDinerStore } from '@/stores/diner'
import { useToastStore } from '@/stores/toast'
import { formatMoney } from '@/utils/money'
import { formatTime } from '@/utils/time'

usePageTitle('Mi cuenta')

const route = useRoute()
const diner = useDinerStore()
const toast = useToastStore()
const confirm = useConfirmStore()

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

  const accepted = await confirm.ask({
    title: '¿Pedir la cuenta?',
    message: 'Avisaremos al personal para que venga a cobrarte.',
    confirmLabel: 'Sí, pedir la cuenta',
  })

  if (!accepted) {
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
  <div class="space-y-5">
    <SkeletonBlock v-if="isLoading" variant="list" :rows="3" />
    <DinerNotice v-else-if="hasConnectionError" kind="connection" @retry="loadAccount" />
    <DinerNotice v-else-if="!attention" kind="info" title="No encontramos esta cuenta" message="Puede que el enlace no sea correcto." />

    <template v-else>
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p class="text-sm font-medium text-on-surface-variant">Mesa {{ attention.tableNumber }}</p>
          <h1 class="font-headline text-3xl font-semibold text-on-surface">Tu cuenta</h1>
        </div>
        <StatusBadge size="md" :tone="attentionStatusTone[attention.status]" :label="attentionStatusLabel[attention.status]" />
      </div>

      <section class="rounded-3xl bg-on-surface p-5 text-surface shadow-sm" aria-label="Resumen de la cuenta">
        <p class="text-sm opacity-80">Saldo pendiente</p>
        <p class="font-headline mt-1 text-4xl font-semibold tabular-nums">{{ formatMoney(account.remaining, currency) }}</p>
        <div class="mt-4 grid grid-cols-2 gap-3 border-t border-surface/20 pt-4 text-sm">
          <div>
            <p class="opacity-80">Total</p>
            <p class="font-semibold tabular-nums">{{ formatMoney(account.total, currency) }}</p>
          </div>
          <div>
            <p class="opacity-80">Pagado</p>
            <p class="font-semibold tabular-nums">{{ formatMoney(account.paid, currency) }}</p>
          </div>
        </div>
      </section>

      <section class="space-y-3 rounded-3xl bg-surface-container-lowest p-5 shadow-sm ring-1 ring-outline-variant/30">
        <h2 class="font-headline text-lg font-semibold text-on-surface">Consumo</h2>
        <ul class="divide-y divide-outline-variant/40">
          <li v-for="item in account.products" :key="item.product.id" class="flex items-center justify-between gap-3 py-2.5 text-base">
            <span class="text-on-surface"><span class="font-semibold">{{ item.product.quantity }}×</span> {{ item.product.name }}</span>
            <span class="font-semibold text-on-surface tabular-nums">{{ formatMoney(item.product.subtotal, currency) }}</span>
          </li>
          <li v-for="product in discarded" :key="product.id" class="flex items-center justify-between gap-3 py-2.5 text-base">
            <span class="text-on-surface-variant line-through">{{ product.quantity }}× {{ product.name }}</span>
            <span class="text-sm text-on-surface-variant">{{ orderedProductStatusLabel[product.status] }} · no se cobra</span>
          </li>
        </ul>
        <p v-if="products.length === 0" class="text-sm text-on-surface-variant">Todavía no hay consumo en esta mesa.</p>
      </section>

      <section class="space-y-3 rounded-3xl bg-surface-container-lowest p-5 shadow-sm ring-1 ring-outline-variant/30">
        <h2 class="font-headline text-lg font-semibold text-on-surface">Pagos registrados</h2>
        <p v-if="payments.length === 0" class="text-sm text-on-surface-variant">
          Todavía no hay pagos. El cobro lo registra el personal del restaurante.
        </p>
        <ul v-else class="divide-y divide-outline-variant/40">
          <li v-for="payment in payments" :key="payment.id" class="flex flex-wrap items-center justify-between gap-2 py-2.5">
            <span class="text-sm text-on-surface-variant">
              {{ formatTime(payment.createdAt, timezone) }} · {{ paymentMethodLabel[payment.method] }}
              <template v-if="payment.payerName"> · {{ payment.payerName }}</template>
            </span>
            <span class="flex items-center gap-2">
              <StatusBadge :tone="paymentStatusTone[payment.status]" :label="paymentStatusLabel[payment.status]" />
              <span class="font-semibold text-on-surface tabular-nums">{{ formatMoney(payment.amount, currency) }}</span>
            </span>
          </li>
        </ul>
      </section>

      <p v-if="actionError" class="rounded-xl bg-error-container px-3 py-2 text-sm text-on-error-container" role="alert">
        {{ actionError }}
      </p>

      <BaseButton v-if="attention.status === 'open'" variant="primary" size="lg" block :loading="isRequesting" @click="askForAccount">
        Solicitar la cuenta
      </BaseButton>
      <p
        v-else-if="attention.status === 'account-requested'"
        class="rounded-2xl bg-warning-container px-4 py-3 text-center text-sm text-on-warning-container"
      >
        Cuenta solicitada: el personal vendrá a cobrarte.
      </p>
    </template>
  </div>
</template>
