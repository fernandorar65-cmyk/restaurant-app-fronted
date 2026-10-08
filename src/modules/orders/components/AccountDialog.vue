<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'

import StatusBadge from '@/components/base/StatusBadge.vue'
import { cancelAttention, closeAttention, errorMessage, isAttentionActive } from '@/modules/orders/api'
import { attentionStatusLabel, attentionStatusTone, orderedProductStatusLabel } from '@/modules/orders/order-status-labels'
import type { Attention, OrderedProduct } from '@/modules/orders/types'
import { computeAccount } from '@/modules/payments/account'
import {
  createPayment,
  fetchPaymentsByAttention,
  nextPaymentStatuses,
  PAYMENT_METHODS,
  paymentMethodLabel,
  paymentStatusLabel,
  paymentStatusTone,
  updatePaymentStatus,
} from '@/modules/payments/api'
import type { Payment, PaymentMethod, PaymentStatus } from '@/modules/payments/types'
import { useSessionStore } from '@/stores/session'
import { useToastStore } from '@/stores/toast'
import { formatMoney, MONEY_EPSILON, roundMoney } from '@/utils/money'
import { createId, formatTime } from '@/utils/time'

const props = defineProps<{
  attention: Attention
  products: OrderedProduct[]
  currency: string
  timezone?: string
}>()

const emit = defineEmits<{
  close: []
  changed: []
}>()

type PayMode = 'all' | 'amount' | 'products'

const session = useSessionStore()
const toast = useToastStore()
const dialogEl = ref<HTMLDialogElement | null>(null)
const payments = ref<Payment[]>([])
const isLoadingPayments = ref(true)
const payChoice = ref<PayMode>('all')
const amount = ref(0)
/** Monto asignado a cada producto en el modo "por productos". */
const allocationDraft = ref<Record<string, number>>({})
const method = ref<PaymentMethod>('card')
const isPendingConfirmation = ref(false)

const METHOD_ICON: Record<PaymentMethod, string> = {
  cash: '💵',
  card: '💳',
  yape: '📱',
  plin: '📲',
  transfer: '🏦',
  other: '➕',
}
const payerName = ref('')
const externalReference = ref('')
const isSubmitting = ref(false)
const submitError = ref<string | null>(null)
const isCancelling = ref(false)
const cancelReason = ref('')
/** Se conserva entre reintentos del mismo cobro para no duplicarlo. */
let requestId = createId('pay')

const staffName = computed(() => session.user?.name ?? null)
const account = computed(() => computeAccount(props.products, payments.value))
const isActive = computed(() => isAttentionActive(props.attention))
const payableProducts = computed(() => account.value.products.filter((item) => item.pending > MONEY_EPSILON))
const discardedProducts = computed(() =>
  props.products.filter((product) => product.status === 'rejected' || product.status === 'cancelled'),
)
const allocationTotal = computed(() =>
  roundMoney(Object.values(allocationDraft.value).reduce((sum, value) => sum + (Number(value) || 0), 0)),
)
const amountToCharge = computed(() => {
  if (payChoice.value === 'all') {
    return account.value.remaining
  }

  return payChoice.value === 'products' ? allocationTotal.value : roundMoney(Number(amount.value) || 0)
})
const needsReference = computed(() => method.value !== 'cash')

function closeDialog(): void {
  dialogEl.value?.close()
}

function resetForm(): void {
  amount.value = account.value.remaining
  allocationDraft.value = {}
  payerName.value = ''
  externalReference.value = ''
  isPendingConfirmation.value = false
  payChoice.value = 'all'
  requestId = createId('pay')
}

function toggleProduct(productId: string, pending: number): void {
  const next = { ...allocationDraft.value }

  if (productId in next) {
    delete next[productId]
  } else {
    next[productId] = pending
  }

  allocationDraft.value = next
}

/** División monetaria de una misma unidad: asigna al producto su pendiente dividido entre N personas. */
function splitProduct(productId: string, pending: number, parts: number): void {
  if (parts > 0) {
    allocationDraft.value = { ...allocationDraft.value, [productId]: roundMoney(pending / parts) }
  }
}

function splitTotal(parts: number): void {
  if (parts > 0) {
    amount.value = roundMoney(account.value.remaining / parts)
  }
}

async function loadPayments(): Promise<void> {
  isLoadingPayments.value = true
  payments.value = await fetchPaymentsByAttention(props.attention.id)
  isLoadingPayments.value = false
}

async function closeIfSettled(): Promise<void> {
  if (account.value.remaining <= MONEY_EPSILON && isActive.value && account.value.total > 0) {
    await closeAttention(props.attention, staffName.value)
    toast.show(`Cuenta de la mesa ${props.attention.tableNumber} cerrada`, { tone: 'success' })
    emit('changed')
  }
}

async function registerPayment(): Promise<void> {
  const value = amountToCharge.value

  if (value <= 0) {
    return
  }

  isSubmitting.value = true
  submitError.value = null

  try {
    const payment = await createPayment({
      attentionId: props.attention.id,
      allocations:
        payChoice.value === 'products'
          ? Object.entries(allocationDraft.value)
              .filter(([, allocated]) => Number(allocated) > 0)
              .map(([orderedProductId, allocated]) => ({ orderedProductId, amount: roundMoney(Number(allocated)) }))
          : [],
      amount: value,
      method: method.value,
      status: isPendingConfirmation.value ? 'pending' : 'paid',
      payerName: payerName.value.trim() || null,
      processedByEmployeeName: staffName.value,
      externalReference: externalReference.value.trim() || null,
      requestId,
    })

    payments.value = [payment, ...payments.value.filter((item) => item.id !== payment.id)]
    resetForm()
    await closeIfSettled()
  } catch (error) {
    submitError.value = errorMessage(error, 'No se pudo registrar el pago.')
    await loadPayments()
  } finally {
    isSubmitting.value = false
  }
}

async function changePaymentStatus(payment: Payment, status: PaymentStatus): Promise<void> {
  submitError.value = null

  try {
    const updated = await updatePaymentStatus(payment, status)
    payments.value = payments.value.map((item) => (item.id === updated.id ? updated : item))
    await closeIfSettled()
  } catch (error) {
    submitError.value = errorMessage(error, 'No se pudo actualizar el pago.')
  }
}

/** Atención sin nada que cobrar (todo rechazado o sin pedidos): se cierra sin pagos. */
async function closeWithoutCharge(): Promise<void> {
  submitError.value = null

  try {
    await closeAttention(props.attention, staffName.value)
    emit('changed')
    closeDialog()
  } catch (error) {
    submitError.value = errorMessage(error, 'No se pudo cerrar la atención.')
  }
}

async function confirmCancel(): Promise<void> {
  submitError.value = null

  try {
    await cancelAttention(props.attention, staffName.value, cancelReason.value)
    emit('changed')
    closeDialog()
  } catch (error) {
    submitError.value = errorMessage(error, 'No se pudo cancelar la atención.')
  }
}

function choosePay(choice: PayMode): void {
  payChoice.value = choice
  allocationDraft.value = {}
  amount.value = account.value.remaining
}

onMounted(async () => {
  await nextTick()
  dialogEl.value?.showModal()
  await loadPayments()
  amount.value = account.value.remaining
})
</script>

<template>
  <dialog
    ref="dialogEl"
    class="app-dialog app-dialog--side overflow-hidden bg-surface-container-lowest p-0 text-on-surface" style="--dialog-width: 36rem"
    aria-labelledby="account-dialog-title"
    @close="emit('close')"
  >
    <div class="flex max-h-[min(92vh,860px)] flex-col">
      <header class="flex items-start justify-between gap-4 px-5 pt-5 pb-4 sm:px-6">
        <div>
          <p class="font-label text-xs font-semibold tracking-widest text-tertiary uppercase">Cuenta de mesa</p>
          <h2 id="account-dialog-title" class="font-headline mt-0.5 text-2xl leading-tight font-semibold">
            Mesa {{ attention.tableNumber }}
          </h2>
        </div>
        <button
          type="button"
          class="touch-target flex items-center justify-center rounded-xl text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
          aria-label="Cerrar"
          @click="closeDialog"
        >
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </header>

      <div class="space-y-5 overflow-y-auto px-5 pb-5 sm:px-6">
        <div class="flex items-center gap-2">
          <StatusBadge :tone="attentionStatusTone[attention.status]" :label="attentionStatusLabel[attention.status]" />
          <span v-if="attention.status === 'account-requested'" class="text-xs font-semibold text-tertiary">
            El comensal solicitó la cuenta
          </span>
        </div>

        <ul class="space-y-2">
          <li v-for="item in account.products" :key="item.product.id" class="flex items-center justify-between gap-3 text-sm">
            <span class="min-w-0">
              <span class="text-on-surface">{{ item.product.quantity }}× {{ item.product.name }}</span>
              <span v-if="item.allocated > 0" class="block text-xs text-on-surface-variant">
                Pagado {{ formatMoney(item.allocated, currency) }} · pendiente {{ formatMoney(item.pending, currency) }}
              </span>
            </span>
            <span class="shrink-0 font-semibold text-on-surface">{{ formatMoney(item.product.subtotal, currency) }}</span>
          </li>
          <li v-for="product in discardedProducts" :key="product.id" class="flex items-center justify-between gap-3 text-sm">
            <span class="text-on-surface-variant line-through">{{ product.quantity }}× {{ product.name }}</span>
            <span class="text-xs text-on-surface-variant">{{ orderedProductStatusLabel[product.status] }} · no se cobra</span>
          </li>
        </ul>

        <dl class="grid grid-cols-3 gap-2.5 border-t border-outline-variant/50 pt-4">
          <div class="rounded-xl bg-surface px-3 py-3">
            <dt class="font-label text-xs font-semibold tracking-wider text-on-surface-variant uppercase">Total</dt>
            <dd class="mt-1 text-sm font-semibold text-on-surface">{{ formatMoney(account.total, currency) }}</dd>
          </div>
          <div class="rounded-xl bg-surface px-3 py-3">
            <dt class="font-label text-xs font-semibold tracking-wider text-on-surface-variant uppercase">Pagado</dt>
            <dd class="mt-1 text-sm font-semibold text-success">{{ formatMoney(account.paid, currency) }}</dd>
          </div>
          <div class="rounded-xl bg-surface px-3 py-3">
            <dt class="font-label text-xs font-semibold tracking-wider text-on-surface-variant uppercase">Pendiente</dt>
            <dd class="mt-1 text-sm font-semibold" :class="account.remaining > 0 ? 'text-error' : 'text-on-surface'">
              {{ formatMoney(account.remaining, currency) }}
            </dd>
          </div>
        </dl>

        <section v-if="isActive && account.remaining > MONEY_EPSILON" class="space-y-5 rounded-2xl bg-surface p-4" aria-label="Registrar pago">
          <div class="space-y-2">
            <p class="text-sm font-semibold text-on-surface">1. ¿Cuánto paga?</p>
            <div class="grid grid-cols-3 gap-1 rounded-xl bg-surface-container p-1" role="radiogroup" aria-label="Qué se cobra">
              <button
                v-for="option in ([['all', 'Todo'], ['amount', 'Un monto'], ['products', 'Por productos']] as const)"
                :key="option[0]"
                type="button"
                role="radio"
                class="font-label min-h-11 rounded-lg text-sm font-semibold transition-colors"
                :class="payChoice === option[0] ? 'bg-surface-container-lowest text-on-surface shadow-sm' : 'text-on-surface-variant hover:text-on-surface'"
                :aria-checked="payChoice === option[0]"
                @click="choosePay(option[0])"
              >
                {{ option[1] }}
              </button>
            </div>

            <p v-if="payChoice === 'all'" class="rounded-xl bg-surface-container-lowest px-4 py-3 text-sm text-on-surface-variant">
              Se cobra el saldo completo: <strong class="text-on-surface">{{ formatMoney(account.remaining, currency) }}</strong>.
            </p>

            <div v-else-if="payChoice === 'amount'" class="space-y-2">
              <label class="flex items-center gap-2">
                <span class="sr-only">Monto</span>
                <input
                  v-model.number="amount"
                  class="min-h-12 w-40 rounded-xl bg-surface-container-lowest px-4 text-lg font-semibold text-on-surface shadow-inner outline-none ring-1 ring-outline-variant/50 focus:ring-2 focus:ring-primary"
                  :max="account.remaining"
                  min="0"
                  step="0.01"
                  type="number"
                  inputmode="decimal"
                />
                <span class="text-sm text-on-surface-variant">de {{ formatMoney(account.remaining, currency) }}</span>
              </label>
              <div class="flex flex-wrap items-center gap-2">
                <span class="text-sm text-on-surface-variant">Dividir entre</span>
                <button
                  v-for="parts in [2, 3, 4, 5]"
                  :key="parts"
                  type="button"
                  class="font-label min-h-11 min-w-11 rounded-xl bg-surface-container-lowest px-3 text-sm font-semibold ring-1 ring-outline-variant/50 hover:ring-primary"
                  @click="splitTotal(parts)"
                >
                  {{ parts }}
                </button>
              </div>
            </div>

            <ul v-else class="space-y-2">
              <li v-for="item in payableProducts" :key="item.product.id" class="space-y-2 rounded-xl bg-surface-container-lowest p-3">
                <label class="flex min-h-11 items-center justify-between gap-3 text-sm">
                  <span class="flex items-center gap-3">
                    <input
                      type="checkbox"
                      class="h-5 w-5 accent-primary"
                      :checked="item.product.id in allocationDraft"
                      @change="toggleProduct(item.product.id, item.pending)"
                    />
                    <span class="text-on-surface">{{ item.product.quantity }}× {{ item.product.name }}</span>
                  </span>
                  <span class="text-on-surface-variant">{{ formatMoney(item.pending, currency) }}</span>
                </label>
                <div v-if="item.product.id in allocationDraft" class="flex flex-wrap items-center gap-2 pl-8">
                  <input
                    v-model.number="allocationDraft[item.product.id]"
                    class="min-h-11 w-28 rounded-xl bg-surface px-3 text-sm text-on-surface shadow-inner outline-none ring-1 ring-outline-variant/50 focus:ring-2 focus:ring-primary"
                    :max="item.pending"
                    min="0"
                    step="0.01"
                    type="number"
                    inputmode="decimal"
                    :aria-label="`Monto para ${item.product.name}`"
                  />
                  <span class="text-sm text-on-surface-variant">Compartir entre</span>
                  <button
                    v-for="parts in [2, 3, 4]"
                    :key="parts"
                    type="button"
                    class="font-label min-h-11 min-w-11 rounded-xl bg-surface px-3 text-sm font-semibold ring-1 ring-outline-variant/50 hover:ring-primary"
                    @click="splitProduct(item.product.id, item.pending, parts)"
                  >
                    {{ parts }}
                  </button>
                </div>
              </li>
            </ul>
          </div>

          <div class="space-y-2">
            <p class="text-sm font-semibold text-on-surface">2. ¿Cómo paga?</p>
            <div class="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Método de pago">
              <button
                v-for="option in PAYMENT_METHODS"
                :key="option"
                type="button"
                role="radio"
                class="font-label flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl text-sm font-semibold ring-2 transition-colors"
                :class="method === option ? 'bg-primary-fixed text-on-primary-fixed ring-primary' : 'bg-surface-container-lowest text-on-surface ring-transparent hover:ring-outline-variant'"
                :aria-checked="method === option"
                @click="method = option"
              >
                <span aria-hidden="true" class="text-lg leading-none">{{ METHOD_ICON[option] }}</span>
                {{ paymentMethodLabel[option] }}
              </button>
            </div>
            <input
              v-if="needsReference"
              v-model="externalReference"
              class="min-h-11 w-full rounded-xl bg-surface-container-lowest px-3 text-sm text-on-surface shadow-inner outline-none ring-1 ring-outline-variant/50 placeholder:text-on-surface-variant/70 focus:ring-2 focus:ring-primary"
              placeholder="N.º de operación (opcional)"
              type="text"
            />
          </div>

          <details class="group rounded-xl bg-surface-container-lowest px-3">
            <summary class="flex min-h-11 cursor-pointer list-none items-center justify-between text-sm font-semibold text-on-surface-variant">
              Más opciones
              <span class="transition-transform group-open:rotate-180" aria-hidden="true">⌄</span>
            </summary>
            <div class="space-y-3 pb-3">
              <input
                v-model="payerName"
                class="min-h-11 w-full rounded-xl bg-surface px-3 text-sm text-on-surface shadow-inner outline-none ring-1 ring-outline-variant/50 placeholder:text-on-surface-variant/70 focus:ring-2 focus:ring-primary"
                placeholder="Nombre de quien paga"
                type="text"
              />
              <label class="flex min-h-11 items-center gap-3 text-sm text-on-surface">
                <input v-model="isPendingConfirmation" type="checkbox" class="h-5 w-5 accent-primary" />
                Todavía no llegó (ej: transferencia por confirmar)
              </label>
            </div>
          </details>

          <button
            type="button"
            class="font-label flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-base font-semibold text-on-primary shadow-sm hover:bg-primary-container disabled:opacity-50"
            :disabled="isSubmitting || amountToCharge <= 0 || amountToCharge > account.remaining + MONEY_EPSILON"
            @click="registerPayment"
          >
            {{ isPendingConfirmation ? 'Registrar como pendiente' : 'Cobrar' }} {{ formatMoney(amountToCharge, currency) }} · {{ paymentMethodLabel[method] }}
          </button>
          <p v-if="amountToCharge > account.remaining + MONEY_EPSILON" class="text-sm text-error" role="alert">
            El monto supera el saldo pendiente ({{ formatMoney(account.remaining, currency) }}).
          </p>
          <p v-else-if="amountToCharge > 0 && amountToCharge + MONEY_EPSILON < account.remaining" class="text-sm text-on-surface-variant">
            Quedarán {{ formatMoney(account.remaining - amountToCharge, currency) }} pendientes.
          </p>
          <p v-else-if="amountToCharge > 0 && !isPendingConfirmation" class="text-sm text-success">Con este pago la cuenta queda saldada y se cierra.</p>
        </section>

        <p v-if="submitError" class="rounded-lg bg-error-container px-3 py-2 text-xs text-on-error-container" role="alert">
          {{ submitError }}
        </p>

        <section v-if="!isLoadingPayments && payments.length > 0" class="space-y-2">
          <h3 class="font-label text-xs font-semibold tracking-widest text-on-surface-variant uppercase">Historial de pagos</h3>
          <ul class="space-y-2">
            <li v-for="payment in payments" :key="payment.id" class="space-y-1.5 rounded-lg bg-surface p-2.5">
              <div class="flex items-center justify-between gap-2 text-sm">
                <span class="text-on-surface">
                  {{ paymentMethodLabel[payment.method] }}
                  <template v-if="payment.payerName"> · {{ payment.payerName }}</template>
                </span>
                <span class="font-semibold" :class="payment.status === 'paid' ? 'text-on-surface' : 'text-on-surface-variant line-through'">
                  {{ formatMoney(payment.amount, currency) }}
                </span>
              </div>
              <div class="flex flex-wrap items-center gap-2 text-xs text-on-surface-variant">
                <StatusBadge :tone="paymentStatusTone[payment.status]" :label="paymentStatusLabel[payment.status]" />
                <span>{{ formatTime(payment.createdAt, timezone) }}</span>
                <span v-if="payment.processedByEmployeeName">· {{ payment.processedByEmployeeName }}</span>
                <span v-if="payment.externalReference">· Ref. {{ payment.externalReference }}</span>
                <span v-if="payment.allocations.length > 0">· {{ payment.allocations.length }} producto(s)</span>
              </div>
              <div v-if="isActive && nextPaymentStatuses(payment.status).length > 0" class="flex flex-wrap gap-1.5">
                <button
                  v-for="status in nextPaymentStatuses(payment.status)"
                  :key="status"
                  type="button"
                  class="font-label rounded bg-surface-container px-2 py-0.5 text-xs font-semibold hover:bg-surface-container-high"
                  @click="changePaymentStatus(payment, status)"
                >
                  Marcar {{ paymentStatusLabel[status].toLowerCase() }}
                </button>
              </div>
            </li>
          </ul>
        </section>

        <div v-if="isCancelling" class="space-y-2 rounded-xl bg-error-container/40 p-3">
          <input
            v-model="cancelReason"
            class="w-full rounded-lg bg-surface-container-lowest min-h-9 px-3 py-1.5 text-sm text-on-surface shadow-inner outline-none ring-1 ring-transparent focus:ring-primary"
            placeholder="Motivo de la cancelación"
            type="text"
          />
          <div class="flex justify-end gap-2">
            <button type="button" class="font-label text-xs font-semibold text-on-surface-variant" @click="isCancelling = false">
              Volver
            </button>
            <button
              type="button"
              class="font-label rounded-lg bg-error min-h-9 px-3 py-1.5 text-sm font-semibold text-on-error disabled:opacity-50"
              :disabled="!cancelReason.trim()"
              @click="confirmCancel"
            >
              Cancelar atención
            </button>
          </div>
        </div>
      </div>

      <footer class="flex gap-2 border-t border-outline-variant/50 px-5 py-3 sm:px-6">
        <button
          v-if="isActive && account.paid === 0 && !isCancelling"
          type="button"
          class="font-label rounded-xl bg-surface-container min-h-11 px-3 py-2.5 text-sm font-semibold text-error hover:bg-surface-container-high"
          @click="isCancelling = true"
        >
          Cancelar atención
        </button>
        <button
          v-if="isActive && account.total === 0 && !isLoadingPayments"
          type="button"
          class="font-label rounded-xl bg-primary min-h-11 px-3 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-container"
          @click="closeWithoutCharge"
        >
          Cerrar sin cargo
        </button>
        <button
          type="button"
          class="font-label ml-auto rounded-xl bg-surface-container min-h-11 px-4 py-2.5 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-high"
          @click="closeDialog"
        >
          Cerrar
        </button>
      </footer>
    </div>
  </dialog>
</template>
