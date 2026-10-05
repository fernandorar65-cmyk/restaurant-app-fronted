<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'

import type { Permission } from '@/modules/auth/permissions'
import {
  cancelAttention,
  ConflictError,
  errorMessage,
  fetchAttentionTimeline,
  isAttentionActive,
  updateOrderedProductStatus,
} from '@/modules/orders/api'
import {
  attentionStatusBadgeClass,
  attentionStatusLabel,
  canCancelOrderedProduct,
  canRejectOrderedProduct,
  isBillableProduct,
  nextOrderedProductActionLabel,
  nextOrderedProductStatus,
  orderedProductBadgeClass,
  orderedProductStatusLabel,
} from '@/modules/orders/order-status-labels'
import { groupByRound, historyStatusLabel } from '@/modules/orders/rounds'
import type { AttentionWithProducts, OrderedProduct, OrderedProductStatus, StatusHistoryEntry } from '@/modules/orders/types'
import { useSessionStore } from '@/stores/session'
import { useToastStore } from '@/stores/toast'
import { formatMoney } from '@/utils/money'
import { formatTime } from '@/utils/time'

const props = defineProps<{
  attention: AttentionWithProducts
  currency: string
  timezone?: string
}>()

const emit = defineEmits<{
  close: []
  changed: []
  addProducts: []
}>()

/** Qué permiso hace falta para avanzar un producto desde cada estado. */
const STEP_PERMISSION: Partial<Record<OrderedProductStatus, Permission>> = {
  sent: 'orders.manage',
  confirmed: 'kitchen.manage',
  preparing: 'kitchen.manage',
  ready: 'delivery.manage',
}

const session = useSessionStore()
const toast = useToastStore()
const dialogEl = ref<HTMLDialogElement | null>(null)
const reasonFor = ref<{ productId: string; action: 'rejected' | 'cancelled' } | null>(null)
const reason = ref('')
const isCancellingAttention = ref(false)
const cancelReason = ref('')
const isHistoryOpen = ref(false)
const history = ref<StatusHistoryEntry[]>([])
const busyId = ref<string | null>(null)
const actionError = ref<string | null>(null)

const staffName = computed(() => session.user?.name ?? 'Personal')
const isActive = computed(() => isAttentionActive(props.attention))
const rounds = computed(() => groupByRound(props.attention.products))
const total = computed(() =>
  props.attention.products.filter((product) => isBillableProduct(product.status)).reduce((sum, p) => sum + p.subtotal, 0),
)

function canAdvance(product: OrderedProduct): boolean {
  const permission = STEP_PERMISSION[product.status]
  return isActive.value && permission !== undefined && session.can(permission)
}

function closeDialog(): void {
  dialogEl.value?.close()
}

async function run(product: OrderedProduct, toStatus: OrderedProductStatus, why: string | null = null): Promise<void> {
  busyId.value = product.id
  actionError.value = null

  try {
    await updateOrderedProductStatus(product, toStatus, staffName.value, why)
    reasonFor.value = null
    reason.value = ''
    emit('changed')
  } catch (error) {
    actionError.value = errorMessage(error, 'No se pudo actualizar el producto.')

    if (error instanceof ConflictError) {
      emit('changed')
    }
  } finally {
    busyId.value = null
  }
}

async function advance(product: OrderedProduct): Promise<void> {
  const next = nextOrderedProductStatus(product.status)

  if (next) {
    await run(product, next)
  }
}

function askReason(product: OrderedProduct, action: 'rejected' | 'cancelled'): void {
  reasonFor.value = { productId: product.id, action }
  reason.value = ''
}

async function confirmReason(product: OrderedProduct): Promise<void> {
  if (!reasonFor.value || !reason.value.trim()) {
    return
  }

  await run(product, reasonFor.value.action, reason.value.trim())
}

async function confirmCancelAttention(): Promise<void> {
  if (!cancelReason.value.trim()) {
    return
  }

  actionError.value = null

  try {
    await cancelAttention(props.attention, staffName.value, cancelReason.value)
    toast.show(`Atención de la mesa ${props.attention.tableNumber} cancelada`, { tone: 'info' })
    emit('changed')
    closeDialog()
  } catch (error) {
    actionError.value = errorMessage(error, 'No se pudo cancelar la atención.')
  }
}

async function toggleHistory(): Promise<void> {
  isHistoryOpen.value = !isHistoryOpen.value

  if (isHistoryOpen.value) {
    history.value = await fetchAttentionTimeline(
      props.attention.id,
      props.attention.products.map((product) => product.id),
    )
  }
}

function productName(entry: StatusHistoryEntry): string {
  if (entry.entityType === 'attention') {
    return 'Atención'
  }

  return props.attention.products.find((product) => product.id === entry.entityId)?.name ?? 'Producto'
}

onMounted(async () => {
  await nextTick()
  dialogEl.value?.showModal()
})
</script>

<template>
  <dialog
    ref="dialogEl"
    class="m-auto w-[min(100%-1.5rem,36rem)] overflow-hidden rounded-2xl bg-surface-container-lowest p-0 text-on-surface shadow-[0_24px_64px_rgba(27,28,29,0.18)] backdrop:bg-on-surface/45"
    aria-labelledby="attention-dialog-title"
    @close="emit('close')"
  >
    <div class="flex max-h-[min(92vh,820px)] flex-col">
      <header class="flex items-start justify-between gap-4 px-5 pt-5 pb-4 sm:px-6">
        <div>
          <p class="font-label text-[11px] font-semibold tracking-widest text-tertiary uppercase">Atención de mesa</p>
          <h2 id="attention-dialog-title" class="font-headline mt-0.5 text-2xl leading-tight font-semibold">
            Mesa {{ attention.tableNumber }}
          </h2>
          <p class="mt-0.5 text-xs text-on-surface-variant">Abierta a las {{ formatTime(attention.openedAt, timezone) }}</p>
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

      <div class="space-y-4 overflow-y-auto px-5 pb-5 sm:px-6">
        <div class="flex flex-wrap items-center gap-2">
          <span class="font-label rounded-lg px-2.5 py-1 text-[11px] font-semibold" :class="attentionStatusBadgeClass[attention.status]">
            {{ attentionStatusLabel[attention.status] }}
          </span>
          <span v-if="attention.status === 'account-requested'" class="text-xs font-semibold text-tertiary">
            El comensal solicitó la cuenta
          </span>
          <span v-if="attention.cancellationReason" class="text-xs text-error">Motivo: {{ attention.cancellationReason }}</span>
        </div>

        <p v-if="actionError" class="rounded-lg bg-error-container px-3 py-2 text-xs text-on-error-container" role="alert">
          {{ actionError }}
        </p>

        <section v-for="(round, index) in rounds" :key="round.batchId" class="space-y-2">
          <h3 class="font-label flex items-center gap-2 text-[11px] font-semibold tracking-widest text-on-surface-variant uppercase">
            Ronda {{ index + 1 }} · {{ formatTime(round.requestedAt, timezone) }}
            <span class="rounded bg-surface-container px-1.5 py-0.5 text-[10px] normal-case tracking-normal">
              {{ round.createdBy ? `Cargado por ${round.createdBy}` : 'Pedido por QR' }}
            </span>
          </h3>
          <ul class="space-y-2">
            <li v-for="product in round.products" :key="product.id" class="space-y-2 rounded-xl bg-surface p-3">
              <div class="flex items-start justify-between gap-2">
                <div>
                  <p class="text-sm font-semibold" :class="isBillableProduct(product.status) ? 'text-on-surface' : 'text-on-surface-variant line-through'">
                    {{ product.quantity }}× {{ product.name }}
                  </p>
                  <p v-if="product.notes" class="text-xs font-medium text-tertiary">Nota: {{ product.notes }}</p>
                </div>
                <span class="text-sm font-semibold text-on-surface">{{ formatMoney(product.subtotal, currency) }}</span>
              </div>

              <div class="flex flex-wrap items-center justify-between gap-2">
                <span class="font-label rounded px-2 py-0.5 text-[10px] font-bold uppercase" :class="orderedProductBadgeClass[product.status]">
                  {{ orderedProductStatusLabel[product.status] }}
                </span>

                <div v-if="isActive && reasonFor?.productId !== product.id" class="flex flex-wrap items-center gap-1.5">
                  <button
                    v-if="session.can('orders.manage') && canRejectOrderedProduct(product.status)"
                    type="button"
                    class="font-label rounded-lg bg-error-container px-2.5 py-1 text-[11px] font-semibold text-on-error-container hover:bg-error/20"
                    @click="askReason(product, 'rejected')"
                  >
                    Rechazar
                  </button>
                  <button
                    v-else-if="session.can('orders.manage') && canCancelOrderedProduct(product.status)"
                    type="button"
                    class="font-label rounded-lg bg-surface-container px-2.5 py-1 text-[11px] font-semibold text-on-surface-variant hover:bg-surface-container-high"
                    @click="askReason(product, 'cancelled')"
                  >
                    Cancelar
                  </button>
                  <button
                    v-if="canAdvance(product)"
                    type="button"
                    class="font-label rounded-lg bg-primary px-2.5 py-1 text-[11px] font-semibold text-on-primary hover:bg-primary-container disabled:opacity-50"
                    :disabled="busyId === product.id"
                    @click="advance(product)"
                  >
                    {{ nextOrderedProductActionLabel(product.status) }}
                  </button>
                </div>
              </div>

              <p v-if="product.rejectionReason" class="text-[11px] text-error">Motivo: {{ product.rejectionReason }}</p>

              <div v-if="reasonFor?.productId === product.id" class="space-y-2 rounded-lg bg-error-container/40 p-2.5">
                <label class="block space-y-1">
                  <span class="font-label text-[10px] font-semibold tracking-wide text-on-surface-variant uppercase">
                    {{ reasonFor.action === 'rejected' ? 'Motivo del rechazo' : 'Motivo de la cancelación' }}
                  </span>
                  <input
                    v-model="reason"
                    class="w-full rounded-lg bg-surface-container-lowest px-3 py-1.5 text-xs text-on-surface shadow-inner outline-none ring-1 ring-transparent focus:ring-primary"
                    placeholder="Ej: producto agotado"
                    type="text"
                    @keydown.enter.prevent="confirmReason(product)"
                  />
                </label>
                <div class="flex justify-end gap-2">
                  <button type="button" class="font-label text-[11px] font-semibold text-on-surface-variant" @click="reasonFor = null">
                    Volver
                  </button>
                  <button
                    type="button"
                    class="font-label rounded-lg bg-error px-2.5 py-1 text-[11px] font-semibold text-on-error disabled:opacity-50"
                    :disabled="!reason.trim() || busyId === product.id"
                    @click="confirmReason(product)"
                  >
                    Confirmar
                  </button>
                </div>
              </div>
            </li>
          </ul>
        </section>
        <p v-if="rounds.length === 0" class="text-sm text-on-surface-variant">Todavía no hay productos en esta atención.</p>

        <div class="flex items-center justify-between border-t border-outline-variant/50 pt-3 text-sm">
          <span class="text-on-surface-variant">Total cobrable</span>
          <span class="font-headline text-lg font-semibold">{{ formatMoney(total, currency) }}</span>
        </div>

        <button type="button" class="font-label text-[11px] font-semibold text-primary underline-offset-2 hover:underline" @click="toggleHistory">
          {{ isHistoryOpen ? 'Ocultar historial' : 'Ver historial de estados' }}
        </button>
        <ul v-if="isHistoryOpen" class="space-y-1.5 rounded-xl bg-surface p-3">
          <li v-if="history.length === 0" class="text-xs text-on-surface-variant">Sin cambios registrados.</li>
          <li v-for="entry in history" :key="entry.id" class="text-[11px] text-on-surface-variant">
            <span class="font-semibold text-on-surface">{{ formatTime(entry.changedAt, timezone) }}</span>
            · {{ productName(entry) }} → <span class="font-semibold text-on-surface">{{ historyStatusLabel(entry) }}</span>
            <template v-if="entry.userName"> · {{ entry.userName }}</template>
            <template v-if="entry.reason"> · {{ entry.reason }}</template>
          </li>
        </ul>

        <div v-if="isCancellingAttention" class="space-y-2 rounded-xl bg-error-container/40 p-3">
          <label class="block space-y-1">
            <span class="font-label text-[10px] font-semibold tracking-wide text-on-surface-variant uppercase">
              Motivo de la cancelación de la atención
            </span>
            <input
              v-model="cancelReason"
              class="w-full rounded-lg bg-surface-container-lowest px-3 py-1.5 text-xs text-on-surface shadow-inner outline-none ring-1 ring-transparent focus:ring-primary"
              placeholder="Ej: los comensales se fueron antes de pedir"
              type="text"
            />
          </label>
          <div class="flex justify-end gap-2">
            <button type="button" class="font-label text-[11px] font-semibold text-on-surface-variant" @click="isCancellingAttention = false">
              Volver
            </button>
            <button
              type="button"
              class="font-label rounded-lg bg-error px-2.5 py-1 text-[11px] font-semibold text-on-error disabled:opacity-50"
              :disabled="!cancelReason.trim()"
              @click="confirmCancelAttention"
            >
              Cancelar atención
            </button>
          </div>
        </div>
      </div>

      <footer class="flex flex-wrap gap-2 border-t border-outline-variant/50 px-5 py-3 sm:px-6">
        <button
          v-if="isActive && session.can('orders.manage') && !isCancellingAttention"
          type="button"
          class="font-label rounded-xl bg-surface-container px-3 py-2.5 text-xs font-semibold text-error hover:bg-surface-container-high"
          @click="isCancellingAttention = true"
        >
          Cancelar atención
        </button>
        <button
          v-if="isActive && session.can('orders.manage')"
          type="button"
          class="font-label rounded-xl bg-primary px-3 py-2.5 text-xs font-semibold text-on-primary hover:bg-primary-container"
          @click="emit('addProducts')"
        >
          + Agregar productos
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
