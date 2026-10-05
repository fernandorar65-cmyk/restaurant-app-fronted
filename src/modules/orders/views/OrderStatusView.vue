<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import DinerNotice from '@/components/feedback/DinerNotice.vue'
import { useNow } from '@/composables/useNow'
import { usePageTitle } from '@/composables/usePageTitle'
import { usePolling } from '@/composables/usePolling'
import {
  errorMessage,
  fetchAttentionById,
  fetchOrderedProductsByAttention,
  isAttentionActive,
  requestAccount,
} from '@/modules/orders/api'
import {
  attentionStatusBadgeClass,
  attentionStatusLabel,
  isBillableProduct,
  orderedProductBadgeClass,
  orderedProductStatusHint,
  orderedProductStatusLabel,
  orderedProductStatusSteps,
} from '@/modules/orders/order-status-labels'
import { groupByRound } from '@/modules/orders/rounds'
import type { Attention, OrderedProduct, OrderedProductStatus } from '@/modules/orders/types'
import { fetchRestaurantById } from '@/modules/restaurants/api'
import { useDinerStore } from '@/stores/diner'
import { useToastStore } from '@/stores/toast'
import { formatMoney } from '@/utils/money'
import { formatElapsed } from '@/utils/time'

usePageTitle('Mi pedido')

const route = useRoute()
const router = useRouter()
const diner = useDinerStore()
const toast = useToastStore()
const now = useNow(30000)

const attention = ref<Attention | null>(null)
const products = ref<OrderedProduct[]>([])
const currency = ref(diner.currency)
const hasConnectionError = ref(false)
const isLoading = ref(true)
const isRequestingAccount = ref(false)
const actionError = ref<string | null>(null)
let previousStatuses: Map<string, OrderedProductStatus> | null = null

const attentionId = computed(() => (typeof route.params.attentionId === 'string' ? route.params.attentionId : null))
const rounds = computed(() => groupByRound(products.value))
const total = computed(() =>
  products.value.filter((product) => isBillableProduct(product.status)).reduce((sum, product) => sum + product.subtotal, 0),
)
const isActive = computed(() => attention.value !== null && isAttentionActive(attention.value))
const isMyTable = computed(
  () =>
    attention.value !== null &&
    diner.isReadyToOrder &&
    diner.restaurantId === attention.value.restaurantId &&
    diner.tableNumber === attention.value.tableNumber,
)

function stepIndex(status: OrderedProductStatus): number {
  return orderedProductStatusSteps.indexOf(status)
}

/** Avisa al comensal cuando un producto pasa a listo o es rechazado. */
function notifyChanges(next: OrderedProduct[]): void {
  if (previousStatuses) {
    for (const product of next) {
      const before = previousStatuses.get(product.id)

      if (before === product.status) {
        continue
      }

      if (product.status === 'ready') {
        toast.show(`¡${product.name} está listo!`, { message: 'En un momento lo llevan a tu mesa.', tone: 'success', vibrate: true, sound: true })
      } else if (product.status === 'rejected') {
        toast.show(`${product.name} no está disponible`, {
          message: product.rejectionReason ?? 'El restaurante rechazó este producto. No se cobra.',
          tone: 'error',
          vibrate: true,
        })
      } else if (product.status === 'confirmed' && before === 'sent') {
        toast.show(`${product.name}: confirmado`, { tone: 'info' })
      }
    }
  }

  previousStatuses = new Map(next.map((product) => [product.id, product.status]))
}

async function loadAttention(): Promise<void> {
  const id = attentionId.value

  if (!id) {
    isLoading.value = false
    return
  }

  try {
    const [fetchedAttention, fetchedProducts] = await Promise.all([
      fetchAttentionById(id),
      fetchOrderedProductsByAttention(id),
    ])

    if (fetchedAttention && (!attention.value || attention.value.restaurantId !== fetchedAttention.restaurantId)) {
      const site = await fetchRestaurantById(fetchedAttention.restaurantId)
      currency.value = site?.currency ?? currency.value
    }

    attention.value = fetchedAttention
    notifyChanges(fetchedProducts)
    products.value = fetchedProducts
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

const polling = usePolling(loadAttention, 6000)

async function askForAccount(): Promise<void> {
  if (!attention.value) {
    return
  }

  isRequestingAccount.value = true
  actionError.value = null

  try {
    attention.value = await requestAccount(attention.value)
    toast.show('Cuenta solicitada', { message: 'El personal ya fue avisado.', tone: 'success' })
  } catch (error) {
    actionError.value = errorMessage(error, 'No se pudo solicitar la cuenta.')
  } finally {
    isRequestingAccount.value = false
  }
}

async function finishVisit(): Promise<void> {
  if (isMyTable.value) {
    diner.leaveTable()
  }

  await router.push({ name: 'home' })
}

watch(
  attentionId,
  (id) => {
    previousStatuses = null
    attention.value = null
    isLoading.value = true

    if (id && diner.isReadyToOrder && !diner.attentionId) {
      diner.setAttention(id)
    }

    void loadAttention()
    polling.start()
  },
  { immediate: true },
)
</script>

<template>
  <div class="space-y-6 pb-8">
    <p v-if="isLoading" class="text-sm text-on-surface-variant">Cargando pedido…</p>
    <DinerNotice v-else-if="hasConnectionError" kind="connection" @retry="loadAttention" />
    <DinerNotice
      v-else-if="!attention"
      kind="info"
      title="No encontramos este pedido"
      message="Puede que el enlace no sea correcto. Escanea el QR de tu mesa para empezar."
    />

    <template v-else>
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p class="font-label text-[11px] font-semibold tracking-widest text-primary uppercase">Mesa {{ attention.tableNumber }}</p>
          <h1 class="font-headline text-2xl font-semibold text-on-surface">Tu pedido</h1>
        </div>
        <span class="font-label inline-flex rounded-lg px-3 py-1 text-xs font-semibold" :class="attentionStatusBadgeClass[attention.status]">
          {{ attentionStatusLabel[attention.status] }}
        </span>
      </div>

      <p
        v-if="attention.status === 'account-requested'"
        class="rounded-xl bg-tertiary-fixed px-4 py-3 text-sm text-on-tertiary-container"
      >
        Pediste la cuenta: el personal ya fue avisado y vendrá a cobrarte. Si quieres, todavía puedes pedir algo más.
      </p>

      <div v-if="attention.status === 'closed'" class="space-y-3 rounded-2xl bg-surface-container-lowest p-6 text-center shadow-sm">
        <p class="font-headline text-xl font-semibold text-on-surface">¡Gracias por tu visita!</p>
        <p class="text-sm text-on-surface-variant">La cuenta de la mesa {{ attention.tableNumber }} quedó saldada.</p>
        <div class="flex flex-wrap justify-center gap-2">
          <RouterLink
            class="font-label rounded-xl bg-surface-container px-4 py-2.5 text-xs font-semibold text-on-surface hover:bg-surface-container-high"
            :to="{ name: 'order-account', params: { attentionId: attention.id } }"
          >
            Ver el detalle de la cuenta
          </RouterLink>
          <button
            type="button"
            class="font-label rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-on-primary hover:bg-primary-container"
            @click="finishVisit"
          >
            Terminar
          </button>
        </div>
      </div>
      <DinerNotice
        v-else-if="attention.status === 'cancelled'"
        kind="attention-closed"
        title="Esta atención fue cancelada"
        :message="attention.cancellationReason ?? 'Pide ayuda a un mozo si crees que es un error.'"
      />

      <section v-for="(round, index) in rounds" :key="round.batchId" class="space-y-3 rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
        <h2 class="font-headline flex items-center justify-between text-sm font-semibold text-on-surface">
          <span>Ronda {{ index + 1 }}</span>
          <span class="font-label text-[11px] font-medium text-on-surface-variant">{{ formatElapsed(round.requestedAt, now) }}</span>
        </h2>
        <ul class="space-y-4">
          <li v-for="product in round.products" :key="product.id" class="space-y-1.5">
            <div class="flex items-center justify-between gap-2 text-sm">
              <span :class="isBillableProduct(product.status) ? 'text-on-surface' : 'text-on-surface-variant line-through'">
                {{ product.quantity }}× {{ product.name }}
              </span>
              <span class="font-semibold text-on-surface">{{ formatMoney(product.subtotal, currency) }}</span>
            </div>
            <div v-if="stepIndex(product.status) >= 0" class="flex gap-1" aria-hidden="true">
              <span
                v-for="(step, stepPosition) in orderedProductStatusSteps"
                :key="step"
                class="h-1.5 flex-1 rounded-full"
                :class="stepPosition <= stepIndex(product.status) ? 'bg-primary' : 'bg-surface-container-high'"
              />
            </div>
            <div class="flex flex-wrap items-center justify-between gap-2">
              <span class="font-label rounded px-2 py-0.5 text-[10px] font-bold uppercase" :class="orderedProductBadgeClass[product.status]">
                {{ orderedProductStatusLabel[product.status] }}
              </span>
              <span class="text-[11px]" :class="product.status === 'rejected' ? 'text-error' : 'text-on-surface-variant'">
                {{ product.status === 'rejected' ? (product.rejectionReason ?? orderedProductStatusHint.rejected) : orderedProductStatusHint[product.status] }}
              </span>
            </div>
            <p v-if="product.notes" class="text-[11px] text-on-surface-variant">Nota: {{ product.notes }}</p>
          </li>
        </ul>
      </section>

      <div class="flex items-center justify-between rounded-2xl bg-surface-container-lowest px-5 py-4 text-sm shadow-sm">
        <span class="text-on-surface-variant">Total (sin productos rechazados)</span>
        <span class="font-headline text-lg font-semibold text-on-surface">{{ formatMoney(total, currency) }}</span>
      </div>

      <p v-if="actionError" class="rounded-lg bg-error-container px-3 py-2 text-xs text-on-error-container" role="alert">
        {{ actionError }}
      </p>

      <div v-if="isActive" class="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <RouterLink
          v-if="isMyTable"
          class="font-label rounded-xl bg-surface-container-lowest py-3 text-center text-sm font-semibold text-on-surface shadow-sm transition-colors hover:bg-surface-container"
          :to="{ name: 'menu' }"
        >
          Pedir algo más
        </RouterLink>
        <button
          v-if="attention.status === 'open'"
          type="button"
          class="font-label rounded-xl bg-surface-container-lowest py-3 text-sm font-semibold text-on-surface shadow-sm transition-colors hover:bg-surface-container disabled:opacity-60"
          :disabled="isRequestingAccount"
          @click="askForAccount"
        >
          {{ isRequestingAccount ? 'Solicitando…' : 'Solicitar la cuenta' }}
        </button>
        <RouterLink
          class="font-label rounded-xl bg-primary py-3 text-center text-sm font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary-container"
          :to="{ name: 'order-account', params: { attentionId: attention.id } }"
        >
          Ver la cuenta
        </RouterLink>
      </div>
    </template>
  </div>
</template>
