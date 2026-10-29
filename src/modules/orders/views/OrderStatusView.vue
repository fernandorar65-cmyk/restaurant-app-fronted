<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import BaseButton from '@/components/base/BaseButton.vue'
import SkeletonBlock from '@/components/base/SkeletonBlock.vue'
import StatusBadge from '@/components/base/StatusBadge.vue'
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
  attentionStatusLabel,
  attentionStatusTone,
  isBillableProduct,
  orderedProductStatusHint,
  orderedProductStatusLabel,
  orderedProductStatusSteps,
  orderedProductStatusTone,
} from '@/modules/orders/order-status-labels'
import { groupByRound } from '@/modules/orders/rounds'
import type { Attention, OrderedProduct, OrderedProductStatus } from '@/modules/orders/types'
import { fetchRestaurantById } from '@/modules/restaurants/api'
import { useConfirmStore } from '@/stores/confirm'
import { useDinerStore } from '@/stores/diner'
import { useToastStore } from '@/stores/toast'
import { formatMoney } from '@/utils/money'
import { formatElapsed } from '@/utils/time'

usePageTitle('Mi pedido')

const route = useRoute()
const router = useRouter()
const diner = useDinerStore()
const toast = useToastStore()
const confirm = useConfirmStore()
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

/** Resumen en una frase de lo más relevante para el comensal ahora mismo. */
const summary = computed(() => {
  const active = products.value.filter((product) => isBillableProduct(product.status))
  const count = (status: OrderedProductStatus) => active.filter((product) => product.status === status).length
  const ready = count('ready')
  const preparing = count('preparing')
  const sent = count('sent')

  if (ready > 0) {
    return { tone: 'success', title: `¡${ready === 1 ? 'Un producto está listo' : `${ready} productos están listos`}!`, text: 'En un momento te los llevan a la mesa.' }
  }

  if (preparing > 0) {
    return { tone: 'progress', title: 'Tu pedido se está preparando', text: `La cocina está con ${preparing} producto(s).` }
  }

  if (sent > 0) {
    return { tone: 'waiting', title: 'Esperando confirmación', text: 'El restaurante está revisando tu pedido.' }
  }

  if (active.length > 0) {
    return { tone: 'success', title: 'Todo servido. ¡Buen provecho!', text: '¿Te apetece algo más? Puedes seguir pidiendo.' }
  }

  return { tone: 'waiting', title: 'Aún no hay productos', text: 'Elige algo de la carta para empezar.' }
})

const summaryClass: Record<string, string> = {
  success: 'bg-success-container text-on-success-container',
  progress: 'bg-deep text-on-deep shadow-md',
  waiting: 'bg-surface-container text-on-surface',
}

/** Etapas del pedido con cuántas unidades hay en cada una (seguimiento de un vistazo). */
const STAGE_ICON: Record<string, string> = {
  sent: 'M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5',
  preparing:
    'M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z',
  ready: 'M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  delivered:
    'M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.871c1.355 0 2.697.056 4.024.166C17.155 8.51 18 9.473 18 10.608v2.513M3 16.5l1.5-.75a3.354 3.354 0 0 1 3 0 3.354 3.354 0 0 0 3 0 3.354 3.354 0 0 1 3 0 3.354 3.354 0 0 0 3 0 3.354 3.354 0 0 1 3 0L21 16.5m-18 0v4.125c0 .621.504 1.125 1.125 1.125h15.75c.621 0 1.125-.504 1.125-1.125V16.5',
}

const STAGE_LABEL: Record<string, string> = { sent: 'Enviado', preparing: 'En cocina', ready: 'Listo', delivered: 'Servido' }

const stages = computed(() =>
  orderedProductStatusSteps.map((status) => ({
    status,
    label: STAGE_LABEL[status] ?? orderedProductStatusLabel[status],
    icon: STAGE_ICON[status] ?? '',
    count: products.value.filter((product) => product.status === status).length,
  })),
)

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
      } else if (product.status === 'preparing' && before === 'sent') {
        toast.show(`${product.name}: confirmado, ya está en cocina`, { tone: 'info' })
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

  const accepted = await confirm.ask({
    title: '¿Pedir la cuenta?',
    message: 'Avisaremos al personal para que venga a cobrarte. Si luego quieres algo más, todavía podrás pedirlo.',
    confirmLabel: 'Sí, pedir la cuenta',
  })

  if (!accepted) {
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
  <div class="space-y-5">
    <SkeletonBlock v-if="isLoading" variant="list" :rows="4" />
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
          <p class="text-sm font-medium text-on-surface-variant">Mesa {{ attention.tableNumber }}</p>
          <h1 class="font-headline text-4xl font-semibold text-on-surface">Tu <span class="text-heading-accent">pedido</span></h1>
        </div>
        <StatusBadge size="md" :tone="attentionStatusTone[attention.status]" :label="attentionStatusLabel[attention.status]" />
      </div>

      <div
        v-if="isActive && products.length > 0"
        class="flex items-center gap-4 rounded-3xl p-5"
        :class="summaryClass[summary.tone]"
        role="status"
        aria-live="polite"
      >
        <span class="relative flex h-3 w-3 shrink-0" :class="{ 'text-deep-accent': summary.tone === 'progress' }" aria-hidden="true">
          <span v-if="summary.tone !== 'waiting'" class="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-40" />
          <span class="relative inline-flex h-3 w-3 rounded-full bg-current" />
        </span>
        <div>
          <p class="font-headline text-xl font-semibold">{{ summary.title }}</p>
          <p class="text-sm opacity-90">{{ summary.text }}</p>
        </div>
      </div>

      <section
        v-if="isActive && products.length > 0"
        class="rounded-3xl bg-surface-container-lowest p-4 shadow-sm ring-1 ring-outline-variant/30"
        aria-label="Seguimiento del pedido"
      >
        <ol class="grid grid-cols-4 gap-2">
          <li v-for="(stage, index) in stages" :key="stage.status" class="relative flex flex-col items-center gap-1.5 text-center">
            <span
              v-if="index > 0"
              class="absolute top-5 right-1/2 h-0.5 w-[calc(100%+0.5rem)]"
              :class="stage.count > 0 || stages.slice(index).some((item) => item.count > 0) ? 'bg-primary/40' : 'bg-surface-container-high'"
              aria-hidden="true"
            />
            <span
              class="relative flex h-10 w-10 items-center justify-center rounded-full transition-colors"
              :class="
                stage.count > 0
                  ? stage.status === 'ready'
                    ? 'bg-success text-on-success'
                    : 'bg-primary text-on-primary'
                  : 'bg-surface-container text-outline'
              "
              aria-hidden="true"
            >
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                <path stroke-linecap="round" stroke-linejoin="round" :d="stage.icon" />
              </svg>
            </span>
            <span class="text-xs font-semibold" :class="stage.count > 0 ? 'text-on-surface' : 'text-on-surface-variant'">{{ stage.label }}</span>
            <span class="font-label text-xs text-on-surface-variant tabular-nums">
              {{ stage.count === 0 ? '—' : `${stage.count} ${stage.count === 1 ? 'producto' : 'productos'}` }}
            </span>
          </li>
        </ol>
      </section>

      <div
        v-if="attention.status === 'account-requested'"
        class="flex items-start gap-3 rounded-2xl bg-warning-container p-4 text-on-warning-container"
        role="status"
      >
        <svg class="mt-0.5 h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0c1.1.128 1.907 1.077 1.907 2.185Z" />
        </svg>
        <p class="text-sm"><strong>Pediste la cuenta.</strong> El personal ya fue avisado y vendrá a cobrarte. Todavía puedes pedir algo más.</p>
      </div>

      <div v-if="attention.status === 'closed'" class="space-y-4 rounded-3xl bg-success-container p-6 text-center text-on-success-container">
        <p class="font-headline text-2xl font-semibold">¡Gracias por tu visita!</p>
        <p class="text-sm">La cuenta de la mesa {{ attention.tableNumber }} quedó saldada.</p>
        <div class="grid gap-2 sm:grid-cols-2">
          <BaseButton variant="secondary" :to="{ name: 'order-account', params: { attentionId: attention.id } }">Ver el detalle</BaseButton>
          <BaseButton variant="primary" @click="finishVisit">Terminar</BaseButton>
        </div>
      </div>
      <DinerNotice
        v-else-if="attention.status === 'cancelled'"
        kind="attention-closed"
        title="Esta atención fue cancelada"
        :message="attention.cancellationReason ?? 'Pide ayuda a un mozo si crees que es un error.'"
      />

      <section
        v-for="(round, index) in rounds"
        :key="round.batchId"
        class="space-y-4 rounded-3xl bg-surface-container-lowest p-5 shadow-sm ring-1 ring-outline-variant/30"
      >
        <h2 class="flex items-center justify-between">
          <span class="font-headline text-lg font-semibold text-on-surface">Ronda {{ index + 1 }}</span>
          <span class="text-sm text-on-surface-variant">{{ formatElapsed(round.requestedAt, now) }}</span>
        </h2>
        <ul class="divide-y divide-outline-variant/40">
          <li v-for="product in round.products" :key="product.id" class="space-y-2 py-3 first:pt-0 last:pb-0">
            <div class="flex items-start justify-between gap-3">
              <span class="text-base" :class="isBillableProduct(product.status) ? 'text-on-surface' : 'text-on-surface-variant line-through'">
                <span class="font-semibold">{{ product.quantity }}×</span> {{ product.name }}
              </span>
              <span class="shrink-0 text-base font-semibold text-on-surface">{{ formatMoney(product.subtotal, currency) }}</span>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <StatusBadge :tone="orderedProductStatusTone[product.status]" :label="orderedProductStatusLabel[product.status]" />
              <span class="text-sm" :class="product.status === 'rejected' ? 'text-error' : 'text-on-surface-variant'">
                {{ product.status === 'rejected' ? (product.rejectionReason ?? orderedProductStatusHint.rejected) : orderedProductStatusHint[product.status] }}
              </span>
            </div>
            <p v-if="product.notes" class="text-sm text-on-surface-variant">Observación: {{ product.notes }}</p>
          </li>
        </ul>
      </section>

      <div class="flex items-center justify-between rounded-2xl bg-surface-container-low px-5 py-4">
        <span class="text-sm text-on-surface-variant">Total (sin productos rechazados)</span>
        <span class="font-headline text-2xl font-semibold text-on-surface">{{ formatMoney(total, currency) }}</span>
      </div>

      <p v-if="actionError" class="rounded-xl bg-error-container px-3 py-2 text-sm text-on-error-container" role="alert">
        {{ actionError }}
      </p>

      <div v-if="isActive" class="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <BaseButton v-if="isMyTable" variant="secondary" size="lg" :to="diner.menuRoute">Pedir algo más</BaseButton>
        <BaseButton
          v-if="attention.status === 'open'"
          variant="primary"
          size="lg"
          :loading="isRequestingAccount"
          @click="askForAccount"
        >
          Solicitar la cuenta
        </BaseButton>
        <BaseButton v-else variant="primary" size="lg" :to="{ name: 'order-account', params: { attentionId: attention.id } }">
          Ver la cuenta
        </BaseButton>
      </div>
    </template>
  </div>
</template>
