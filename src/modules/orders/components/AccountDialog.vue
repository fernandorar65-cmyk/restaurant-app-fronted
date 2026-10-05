<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'

import { cancelAttention, closeAttention, errorMessage, isAttentionActive } from '@/modules/orders/api'
import { attentionStatusBadgeClass, attentionStatusLabel, orderedProductStatusLabel } from '@/modules/orders/order-status-labels'
import type { Attention, OrderedProduct } from '@/modules/orders/types'
import { computeAccount } from '@/modules/payments/account'
import {
  createPayment,
  fetchPaymentsByAttention,
  nextPaymentStatuses,
  PAYMENT_METHODS,
  paymentMethodLabel,
  paymentStatusBadgeClass,
  paymentStatusLabel,
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

type PayMode = 'amount' | 'products'

const session = useSessionStore()
const toast = useToastStore()
const dialogEl = ref<HTMLDialogElement | null>(null)
const payments = ref<Payment[]>([])
const isLoadingPayments = ref(true)
const mode = ref<PayMode>('amount')
const amount = ref(0)
/** Monto asignado a cada producto en el modo "por productos". */
const allocationDraft = ref<Record<string, number>>({})
const method = ref<PaymentMethod>('card')
const initialStatus = ref<PaymentStatus>('paid')
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
const amountToCharge = computed(() => (mode.value === 'products' ? allocationTotal.value : roundMoney(Number(amount.value) || 0)))
const needsReference = computed(() => method.value !== 'cash')

function closeDialog(): void {
  dialogEl.value?.close()
}

function resetForm(): void {
  amount.value = account.value.remaining
  allocationDraft.value = {}
  payerName.value = ''
  externalReference.value = ''
  initialStatus.value = 'paid'
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
        mode.value === 'products'
          ? Object.entries(allocationDraft.value)
              .filter(([, allocated]) => Number(allocated) > 0)
              .map(([orderedProductId, allocated]) => ({ orderedProductId, amount: roundMoney(Number(allocated)) }))
          : [],
      amount: value,
      method: method.value,
      status: initialStatus.value,
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

watch(mode, () => {
  allocationDraft.value = {}
  amount.value = account.value.remaining
})

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
    class="m-auto w-[min(100%-1.5rem,36rem)] overflow-hidden rounded-2xl bg-surface-container-lowest p-0 text-on-surface shadow-[0_24px_64px_rgba(27,28,29,0.18)] backdrop:bg-on-surface/45"
    aria-labelledby="account-dialog-title"
    @close="emit('close')"
  >
    <div class="flex max-h-[min(92vh,860px)] flex-col">
      <header class="flex items-start justify-between gap-4 px-5 pt-5 pb-4 sm:px-6">
        <div>
          <p class="font-label text-[11px] font-semibold tracking-widest text-tertiary uppercase">Cuenta de mesa</p>
          <h2 id="account-dialog-title" class="font-headline mt-0.5 text-2xl leading-tight font-semibold">
            Mesa {{ attention.tableNumber }}
          </h2>
        </div>
        <button
          type="button"
          class="rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
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
          <span class="font-label inline-flex rounded-lg px-2.5 py-1 text-[11px] font-semibold" :class="attentionStatusBadgeClass[attention.status]">
            {{ attentionStatusLabel[attention.status] }}
          </span>
          <span v-if="attention.status === 'account-requested'" class="text-xs font-semibold text-tertiary">
            El comensal solicitó la cuenta
          </span>
        </div>

        <ul class="space-y-2">
          <li v-for="item in account.products" :key="item.product.id" class="flex items-center justify-between gap-3 text-sm">
            <span class="min-w-0">
              <span class="text-on-surface">{{ item.product.quantity }}× {{ item.product.name }}</span>
              <span v-if="item.allocated > 0" class="block text-[11px] text-on-surface-variant">
                Pagado {{ formatMoney(item.allocated, currency) }} · pendiente {{ formatMoney(item.pending, currency) }}
              </span>
            </span>
            <span class="shrink-0 font-semibold text-on-surface">{{ formatMoney(item.product.subtotal, currency) }}</span>
          </li>
          <li v-for="product in discardedProducts" :key="product.id" class="flex items-center justify-between gap-3 text-sm">
            <span class="text-on-surface-variant line-through">{{ product.quantity }}× {{ product.name }}</span>
            <span class="text-[11px] text-on-surface-variant">{{ orderedProductStatusLabel[product.status] }} · no se cobra</span>
          </li>
        </ul>

        <dl class="grid grid-cols-3 gap-2.5 border-t border-outline-variant/50 pt-4">
          <div class="rounded-xl bg-surface px-3 py-3">
            <dt class="font-label text-[10px] font-semibold tracking-wider text-on-surface-variant uppercase">Total</dt>
            <dd class="mt-1 text-sm font-semibold text-on-surface">{{ formatMoney(account.total, currency) }}</dd>
          </div>
          <div class="rounded-xl bg-surface px-3 py-3">
            <dt class="font-label text-[10px] font-semibold tracking-wider text-on-surface-variant uppercase">Pagado</dt>
            <dd class="mt-1 text-sm font-semibold text-emerald-700">{{ formatMoney(account.paid, currency) }}</dd>
          </div>
          <div class="rounded-xl bg-surface px-3 py-3">
            <dt class="font-label text-[10px] font-semibold tracking-wider text-on-surface-variant uppercase">Pendiente</dt>
            <dd class="mt-1 text-sm font-semibold" :class="account.remaining > 0 ? 'text-error' : 'text-on-surface'">
              {{ formatMoney(account.remaining, currency) }}
            </dd>
          </div>
        </dl>

        <section v-if="isActive && account.remaining > MONEY_EPSILON" class="space-y-3 rounded-xl bg-surface p-4">
          <div class="flex items-center justify-between gap-2">
            <h3 class="font-label text-[11px] font-semibold tracking-widest text-on-surface-variant uppercase">Registrar pago</h3>
            <div class="flex gap-1 rounded-lg bg-surface-container p-0.5" role="tablist" aria-label="Tipo de pago">
              <button
                v-for="option in ([['amount', 'Monto'], ['products', 'Por productos']] as const)"
                :key="option[0]"
                type="button"
                class="font-label rounded-md px-2.5 py-1 text-[11px] font-semibold"
                :class="mode === option[0] ? 'bg-surface-container-lowest text-on-surface shadow-sm' : 'text-on-surface-variant'"
                @click="mode = option[0]"
              >
                {{ option[1] }}
              </button>
            </div>
          </div>

          <template v-if="mode === 'amount'">
            <div class="flex flex-wrap items-center gap-2">
              <input
                v-model.number="amount"
                class="w-32 rounded-lg bg-surface-container-lowest px-3 py-2 text-sm text-on-surface shadow-inner outline-none ring-1 ring-transparent focus:ring-primary"
                :max="account.remaining"
                min="0"
                step="0.01"
                type="number"
                aria-label="Monto"
              />
              <span class="text-[11px] text-on-surface-variant">Dividir el saldo entre</span>
              <button
                v-for="parts in [2, 3, 4]"
                :key="parts"
                type="button"
                class="font-label rounded-lg bg-surface-container px-2 py-1 text-[11px] font-semibold hover:bg-surface-container-high"
                @click="splitTotal(parts)"
              >
                {{ parts }}
              </button>
            </div>
          </template>

          <ul v-else class="space-y-2">
            <li v-for="item in payableProducts" :key="item.product.id" class="space-y-1.5 rounded-lg bg-surface-container-lowest p-2.5">
              <label class="flex items-center justify-between gap-2 text-sm">
                <span class="flex items-center gap-2">
                  <input
                    type="checkbox"
                    class="accent-primary"
                    :checked="item.product.id in allocationDraft"
                    @change="toggleProduct(item.product.id, item.pending)"
                  />
                  {{ item.product.quantity }}× {{ item.product.name }}
                </span>
                <span class="text-xs text-on-surface-variant">pendiente {{ formatMoney(item.pending, currency) }}</span>
              </label>
              <div v-if="item.product.id in allocationDraft" class="flex flex-wrap items-center gap-2 pl-6">
                <input
                  v-model.number="allocationDraft[item.product.id]"
                  class="w-24 rounded-lg bg-surface px-2 py-1 text-xs text-on-surface shadow-inner outline-none ring-1 ring-transparent focus:ring-primary"
                  :max="item.pending"
                  min="0"
                  step="0.01"
                  type="number"
                  :aria-label="`Monto para ${item.product.name}`"
                />
                <span class="text-[11px] text-on-surface-variant">Dividir entre</span>
                <button
                  v-for="parts in [2, 3, 4]"
                  :key="parts"
                  type="button"
                  class="font-label rounded bg-surface-container px-1.5 py-0.5 text-[11px] font-semibold hover:bg-surface-container-high"
                  @click="splitProduct(item.product.id, item.pending, parts)"
                >
                  {{ parts }}
                </button>
              </div>
            </li>
          </ul>

          <div class="grid grid-cols-2 gap-2">
            <select
              v-model="method"
              class="rounded-lg bg-surface-container-lowest px-3 py-2 text-sm text-on-surface shadow-inner outline-none ring-1 ring-transparent focus:ring-primary"
              aria-label="Método de pago"
            >
              <option v-for="option in PAYMENT_METHODS" :key="option" :value="option">{{ paymentMethodLabel[option] }}</option>
            </select>
            <select
              v-model="initialStatus"
              class="rounded-lg bg-surface-container-lowest px-3 py-2 text-sm text-on-surface shadow-inner outline-none ring-1 ring-transparent focus:ring-primary"
              aria-label="Estado del pago"
            >
              <option value="paid">Pagado</option>
              <option value="pending">Pendiente de confirmar</option>
            </select>
          </div>
          <input
            v-if="needsReference"
            v-model="externalReference"
            class="w-full rounded-lg bg-surface-container-lowest px-3 py-2 text-sm text-on-surface shadow-inner outline-none ring-1 ring-transparent placeholder:text-on-surface-variant/60 focus:ring-primary"
            placeholder="Referencia / N.º de operación (opcional)"
            type="text"
          />
          <input
            v-model="payerName"
            class="w-full rounded-lg bg-surface-container-lowest px-3 py-2 text-sm text-on-surface shadow-inner outline-none ring-1 ring-transparent placeholder:text-on-surface-variant/60 focus:ring-primary"
            placeholder="Nombre de quien paga (opcional)"
            type="text"
          />
          <button
            type="button"
            class="font-label w-full rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-on-primary hover:bg-primary-container disabled:opacity-60"
            :disabled="isSubmitting || amountToCharge <= 0 || amountToCharge > account.remaining + MONEY_EPSILON"
            @click="registerPayment"
          >
            {{ initialStatus === 'paid' ? 'Cobrar' : 'Registrar pendiente' }} {{ formatMoney(amountToCharge, currency) }}
          </button>
          <p v-if="amountToCharge > account.remaining + MONEY_EPSILON" class="text-xs text-error">
            El monto supera el saldo pendiente.
          </p>
        </section>

        <p v-if="submitError" class="rounded-lg bg-error-container px-3 py-2 text-xs text-on-error-container" role="alert">
          {{ submitError }}
        </p>

        <section v-if="!isLoadingPayments && payments.length > 0" class="space-y-2">
          <h3 class="font-label text-[11px] font-semibold tracking-widest text-on-surface-variant uppercase">Historial de pagos</h3>
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
              <div class="flex flex-wrap items-center gap-2 text-[11px] text-on-surface-variant">
                <span class="font-label rounded px-1.5 py-0.5 font-bold uppercase" :class="paymentStatusBadgeClass[payment.status]">
                  {{ paymentStatusLabel[payment.status] }}
                </span>
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
                  class="font-label rounded bg-surface-container px-2 py-0.5 text-[11px] font-semibold hover:bg-surface-container-high"
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
            class="w-full rounded-lg bg-surface-container-lowest px-3 py-1.5 text-xs text-on-surface shadow-inner outline-none ring-1 ring-transparent focus:ring-primary"
            placeholder="Motivo de la cancelación"
            type="text"
          />
          <div class="flex justify-end gap-2">
            <button type="button" class="font-label text-[11px] font-semibold text-on-surface-variant" @click="isCancelling = false">
              Volver
            </button>
            <button
              type="button"
              class="font-label rounded-lg bg-error px-2.5 py-1 text-[11px] font-semibold text-on-error disabled:opacity-50"
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
          class="font-label rounded-xl bg-surface-container px-3 py-2.5 text-xs font-semibold text-error hover:bg-surface-container-high"
          @click="isCancelling = true"
        >
          Cancelar atención
        </button>
        <button
          v-if="isActive && account.total === 0 && !isLoadingPayments"
          type="button"
          class="font-label rounded-xl bg-primary px-3 py-2.5 text-xs font-semibold text-on-primary hover:bg-primary-container"
          @click="closeWithoutCharge"
        >
          Cerrar sin cargo
        </button>
        <button
          type="button"
          class="font-label ml-auto rounded-xl bg-surface-container px-4 py-2.5 text-xs font-semibold text-on-surface transition-colors hover:bg-surface-container-high"
          @click="closeDialog"
        >
          Cerrar
        </button>
      </footer>
    </div>
  </dialog>
</template>
