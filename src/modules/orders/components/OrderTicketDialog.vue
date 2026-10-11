<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import BaseButton from '@/components/base/BaseButton.vue'
import BaseDialog from '@/components/base/BaseDialog.vue'
import { fetchMenuProducts } from '@/modules/menus/api'
import type { MenuProduct } from '@/modules/menus/types'
import { fetchAttentionTimeline } from '@/modules/orders/api'
import type { BoardCard } from '@/modules/orders/components/OrdersBoard.vue'
import {
  nextOrderedProductActionLabel,
  nextOrderedProductStatus,
  orderedProductStatusLabel,
  orderedProductStepPermission,
} from '@/modules/orders/order-status-labels'
import type { OrderedProductStatus, StatusHistoryEntry } from '@/modules/orders/types'
import { useSessionStore } from '@/stores/session'
import { formatMoney } from '@/utils/money'
import { formatElapsed, formatTime } from '@/utils/time'

/** Detalle de una comanda del tablero: platos con su ficha, línea de tiempo y acciones. */
const props = defineProps<{
  ticket: BoardCard
  currency: string
  timezone?: string
  now: number
  busy: boolean
}>()

const emit = defineEmits<{
  close: []
  advance: []
  openAttention: []
}>()

const session = useSessionStore()
const menu = ref<MenuProduct[]>([])
const history = ref<StatusHistoryEntry[]>([])
const isLoading = ref(true)

onMounted(async () => {
  try {
    const [products, timeline] = await Promise.all([
      fetchMenuProducts(props.ticket.attention.restaurantId),
      fetchAttentionTimeline(
        props.ticket.attention.id,
        props.ticket.products.map((product) => product.id),
      ),
    ])
    menu.value = products
    history.value = timeline
  } finally {
    isLoading.value = false
  }
})

/** Ficha de la carta de cada plato (foto, ingredientes, alérgenos, tiempo). */
const lines = computed(() =>
  props.ticket.products.map((product) => ({ product, info: menu.value.find((item) => item.id === product.productId) ?? null })),
)

const total = computed(() => props.ticket.products.reduce((sum, product) => sum + product.subtotal, 0))
const units = computed(() => props.ticket.products.reduce((sum, product) => sum + product.quantity, 0))
const allergens = computed(() => [...new Set(lines.value.flatMap((line) => line.info?.allergens ?? []))])
const estimatedMinutes = computed(() => Math.max(0, ...lines.value.map((line) => line.info?.prepMinutes ?? 0)))

const STEPS: Array<{ status: OrderedProductStatus; label: string }> = [
  { status: 'sent', label: 'Pedido' },
  { status: 'preparing', label: 'En preparación' },
  { status: 'ready', label: 'Listo' },
  { status: 'delivered', label: 'Entregado' },
]

/**
 * Línea de tiempo de la comanda: para cada paso, el primer momento en que algún plato
 * llegó a ese estado y quién lo hizo, según el historial.
 */
const timeline = computed(() => {
  const ids = new Set(props.ticket.products.map((product) => product.id))
  const currentIndex = STEPS.findIndex((step) => step.status === props.ticket.status)

  return STEPS.map((step, index) => {
    if (step.status === 'sent') {
      return { ...step, at: props.ticket.requestedAt, by: props.ticket.createdBy ?? 'Cliente (QR)', done: true, current: index === currentIndex }
    }

    const entry = history.value
      // Se ignoran registros anteriores al pedido (datos viejos o inconsistentes).
      .filter(
        (item) =>
          item.entityType === 'orderedProduct' && ids.has(item.entityId) && item.toStatus === step.status && item.changedAt >= props.ticket.requestedAt,
      )
      .sort((a, b) => (a.changedAt < b.changedAt ? -1 : 1))[0]

    return { ...step, at: entry?.changedAt ?? null, by: entry?.userName ?? null, done: index <= currentIndex, current: index === currentIndex }
  })
})

function minutesBetween(from: string, to: string): number {
  return Math.max(0, Math.round((new Date(to).getTime() - new Date(from).getTime()) / 60000))
}

const next = computed(() => nextOrderedProductStatus(props.ticket.status))
const canAdvance = computed(() => {
  const permission = orderedProductStepPermission[props.ticket.status]
  return Boolean(next.value) && Boolean(permission && session.can(permission))
})
</script>

<template>
  <BaseDialog
    :title="`Mesa ${ticket.attention.tableNumber} · Ronda ${ticket.roundNumber}`"
    :eyebrow="orderedProductStatusLabel[ticket.status]"
    :subtitle="`Pedido ${formatElapsed(ticket.requestedAt, now)} · ${ticket.createdBy ? `cargado por ${ticket.createdBy}` : 'por QR'}`"
    size="md"
    @close="emit('close')"
  >
    <!-- Resumen -->
    <dl class="grid grid-cols-3 gap-2 text-center">
      <div class="rounded-xl bg-surface-container-low px-2 py-3">
        <dt class="text-xs text-on-surface-variant">Platos</dt>
        <dd class="font-headline text-xl font-semibold text-on-surface">{{ units }}</dd>
      </div>
      <div class="rounded-xl bg-surface-container-low px-2 py-3">
        <dt class="text-xs text-on-surface-variant">Importe</dt>
        <dd class="font-headline text-xl font-semibold text-on-surface">{{ formatMoney(total, currency) }}</dd>
      </div>
      <div class="rounded-xl bg-surface-container-low px-2 py-3">
        <dt class="text-xs text-on-surface-variant">Prep. estimada</dt>
        <dd class="font-headline text-xl font-semibold text-on-surface">{{ estimatedMinutes ? `${estimatedMinutes} min` : '—' }}</dd>
      </div>
    </dl>

    <p v-if="allergens.length > 0" class="flex items-start gap-2 rounded-xl bg-warning-container px-3 py-2.5 text-sm text-on-warning-container">
      <svg class="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
        />
      </svg>
      <span>Contiene <strong>{{ allergens.join(', ') }}</strong>. Confirma alergias con la mesa.</span>
    </p>

    <!-- Platos -->
    <section class="space-y-2">
      <h3 class="font-label text-xs font-semibold tracking-wider text-outline uppercase">Platos</h3>
      <ul class="divide-y divide-outline-variant/40 rounded-2xl ring-1 ring-outline-variant/40">
        <li v-for="{ product, info } in lines" :key="product.id" class="flex gap-3 p-3">
          <img v-if="info?.imageUrl" :src="info.imageUrl" alt="" class="h-16 w-16 shrink-0 rounded-xl object-cover" loading="lazy" />
          <span v-else class="h-16 w-16 shrink-0 rounded-xl bg-surface-container" aria-hidden="true" />
          <div class="min-w-0 flex-1 space-y-1">
            <div class="flex items-start justify-between gap-3">
              <p class="font-semibold text-on-surface">
                <span class="text-primary">{{ product.quantity }}×</span> {{ product.name }}
              </p>
              <span class="shrink-0 text-sm font-semibold text-on-surface tabular-nums">{{ formatMoney(product.subtotal, currency) }}</span>
            </div>
            <p v-if="product.notes" class="rounded-lg bg-tertiary-fixed/50 px-2 py-1 text-sm font-medium text-on-tertiary-container">
              Nota: {{ product.notes }}
            </p>
            <p v-if="info?.ingredients.length" class="text-xs text-on-surface-variant">{{ info.ingredients.join(' · ') }}</p>
            <p class="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-on-surface-variant">
              <span>{{ formatMoney(product.unitPrice, currency) }} c/u</span>
              <span v-if="info?.prepMinutes">{{ info.prepMinutes }} min de preparación</span>
              <span v-if="info?.portion">{{ info.portion }}</span>
            </p>
          </div>
        </li>
      </ul>
      <p v-if="isLoading" class="text-xs text-on-surface-variant">Cargando ficha de los platos…</p>
    </section>

    <!-- Línea de tiempo -->
    <section class="space-y-2">
      <h3 class="font-label text-xs font-semibold tracking-wider text-outline uppercase">Seguimiento</h3>
      <ol class="space-y-0">
        <li v-for="(step, index) in timeline" :key="step.status" class="relative flex gap-3 pb-4 last:pb-0">
          <!-- Conector -->
          <span
            v-if="index < timeline.length - 1"
            class="absolute top-6 bottom-0 left-[11px] w-0.5"
            :class="timeline[index + 1]!.done ? 'bg-primary' : 'bg-outline-variant'"
            aria-hidden="true"
          />
          <span
            class="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ring-4 ring-surface-container-lowest"
            :class="step.current ? 'bg-primary text-on-primary' : step.done ? 'bg-primary-fixed text-on-primary-fixed' : 'bg-surface-container text-outline'"
            aria-hidden="true"
          >
            <svg v-if="step.done && !step.current" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
              <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
            <span v-else class="h-2 w-2 rounded-full bg-current" />
          </span>
          <div class="min-w-0 flex-1">
            <p class="flex flex-wrap items-baseline justify-between gap-x-2 text-sm">
              <span :class="step.done ? 'font-semibold text-on-surface' : 'text-on-surface-variant'">{{ step.label }}</span>
              <span v-if="step.at" class="text-xs text-on-surface-variant tabular-nums">{{ formatTime(step.at, timezone) }}</span>
              <span v-else class="text-xs text-outline">Pendiente</span>
            </p>
            <p v-if="step.by || (step.at && index > 0 && timeline[index - 1]!.at)" class="text-xs text-on-surface-variant">
              <template v-if="step.by">{{ step.by }}</template>
              <template v-if="step.at && index > 0 && timeline[index - 1]!.at">
                {{ step.by ? ' · ' : '' }}{{ minutesBetween(timeline[index - 1]!.at!, step.at) }} min desde el paso anterior
              </template>
            </p>
          </div>
        </li>
      </ol>
    </section>

    <template #footer>
      <BaseButton variant="ghost" @click="emit('openAttention')">Ver mesa completa</BaseButton>
      <BaseButton v-if="canAdvance" variant="primary" class="ml-auto" :loading="busy" @click="emit('advance')">
        {{ nextOrderedProductActionLabel(ticket.status) }} → {{ orderedProductStatusLabel[next!] }}
      </BaseButton>
    </template>
  </BaseDialog>
</template>
