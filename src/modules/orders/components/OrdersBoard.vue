<script setup lang="ts">
import { computed, ref } from 'vue'

import { isAttentionActive } from '@/modules/orders/api'
import {
  nextOrderedProductActionLabel,
  nextOrderedProductStatus,
  orderedProductStatusLabel,
  orderedProductStepPermission,
} from '@/modules/orders/order-status-labels'
import { delayLabel, delayLevel, groupByRound, INCOMING_DELAY_MINUTES, KITCHEN_DELAY_MINUTES } from '@/modules/orders/rounds'
import type { AttentionWithProducts, OrderedProduct, OrderedProductStatus } from '@/modules/orders/types'
import { useSessionStore } from '@/stores/session'
import { formatElapsed, minutesSince } from '@/utils/time'

/**
 * Tablero de pedidos por estado (estilo Jira). Cada tarjeta es una comanda: los productos
 * de una misma ronda de una mesa que están en ese estado. Se avanza al siguiente paso
 * arrastrando la tarjeta a la columna siguiente o con su botón.
 */
const props = defineProps<{
  attentions: AttentionWithProducts[]
  now: number
  /** Tarjeta que se está actualizando. */
  busyKey: string | null
}>()

const emit = defineEmits<{
  advance: [payload: { key: string; tableNumber: string; products: OrderedProduct[]; to: OrderedProductStatus }]
  /** Al tocar una tarjeta: abre el detalle de la comanda. */
  select: [card: BoardCard]
}>()

const session = useSessionStore()

const COLUMNS: Array<{ status: OrderedProductStatus; title: string; hint: string; dot: string }> = [
  { status: 'sent', title: 'Nuevos', hint: 'Por confirmar', dot: 'bg-error' },
  { status: 'preparing', title: 'En preparación', hint: 'En cocina', dot: 'bg-primary' },
  { status: 'ready', title: 'Listos', hint: 'Para servir', dot: 'bg-tertiary' },
  { status: 'delivered', title: 'Entregados', hint: 'Mesas en curso', dot: 'bg-success' },
]

export interface BoardCard {
  key: string
  attention: AttentionWithProducts
  roundNumber: number
  requestedAt: string
  createdBy: string | null
  status: OrderedProductStatus
  products: OrderedProduct[]
}

const cards = computed<BoardCard[]>(() =>
  props.attentions.flatMap((attention) =>
    groupByRound(attention.products).flatMap((round, index) =>
      COLUMNS.map(({ status }) => ({
        key: `${round.batchId}:${status}`,
        attention,
        roundNumber: index + 1,
        requestedAt: round.requestedAt,
        createdBy: round.createdBy,
        status,
        products: round.products.filter((product) => product.status === status),
      // Solo mesas en curso: al cerrar la cuenta, sus comandas (también las entregadas) salen del tablero.
      })).filter((card) => card.products.length > 0 && isAttentionActive(attention)),
    ),
  ),
)

const columns = computed(() =>
  COLUMNS.map((column) => {
    const items = cards.value.filter((card) => card.status === column.status)
    // Activas: la más antigua primero (atender en orden). Entregados: la más reciente primero.
    items.sort((a, b) => (column.status === 'delivered' ? (a.requestedAt < b.requestedAt ? 1 : -1) : a.requestedAt < b.requestedAt ? -1 : 1))
    return { ...column, items, units: items.reduce((sum, card) => sum + card.products.reduce((acc, product) => acc + product.quantity, 0), 0) }
  }),
)

function canAdvance(card: BoardCard): boolean {
  const permission = orderedProductStepPermission[card.status]
  return Boolean(nextOrderedProductStatus(card.status)) && Boolean(permission && session.can(permission))
}

function delayOf(card: BoardCard) {
  if (card.status === 'delivered') return 'ok' as const
  const limit = card.status === 'preparing' ? KITCHEN_DELAY_MINUTES : INCOMING_DELAY_MINUTES
  return delayLevel(minutesSince(card.requestedAt, props.now), limit)
}

function advance(card: BoardCard): void {
  const to = nextOrderedProductStatus(card.status)
  if (to && canAdvance(card)) {
    emit('advance', { key: card.key, tableNumber: card.attention.tableNumber, products: card.products, to })
  }
}

/* ── Arrastrar y soltar ─────────────────────────────────────────── */

const dragging = ref<BoardCard | null>(null)
const dropTarget = ref<OrderedProductStatus | null>(null)

/** Solo se puede soltar en la columna del paso siguiente. */
function acceptsDrop(status: OrderedProductStatus): boolean {
  return dragging.value !== null && nextOrderedProductStatus(dragging.value.status) === status
}

function onDragStart(event: DragEvent, card: BoardCard): void {
  dragging.value = card
  event.dataTransfer?.setData('text/plain', card.key)
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}

function onDragEnd(): void {
  dragging.value = null
  dropTarget.value = null
}

function onDragOver(event: DragEvent, status: OrderedProductStatus): void {
  if (acceptsDrop(status)) {
    event.preventDefault()
    dropTarget.value = status
  }
}

function onDrop(status: OrderedProductStatus): void {
  const card = dragging.value
  onDragEnd()
  if (card && nextOrderedProductStatus(card.status) === status) advance(card)
}
</script>

<template>
  <!-- En pantallas chicas las columnas se desplazan en horizontal, como un tablero -->
  <div class="-mx-4 overflow-x-auto px-4 pb-2 lg:mx-0 lg:px-0">
    <div class="grid min-w-[56rem] grid-cols-4 gap-3">
      <section
        v-for="column in columns"
        :key="column.status"
        class="flex min-h-[28rem] flex-col rounded-2xl bg-surface-container-low p-2.5 transition-[box-shadow,background-color]"
        :class="[
          dragging && acceptsDrop(column.status) ? 'ring-2 ring-primary/50' : '',
          dropTarget === column.status ? 'bg-primary-fixed/40' : '',
          dragging && !acceptsDrop(column.status) && dragging.status !== column.status ? 'opacity-60' : '',
        ]"
        :aria-label="`${column.title}: ${column.items.length} comandas`"
        @dragover="onDragOver($event, column.status)"
        @dragleave="dropTarget = dropTarget === column.status ? null : dropTarget"
        @drop.prevent="onDrop(column.status)"
      >
        <header class="space-y-0.5 px-1.5 pt-1 pb-2.5">
          <h3 class="flex items-center gap-2 text-sm font-semibold whitespace-nowrap text-on-surface">
            <span class="h-2 w-2 shrink-0 rounded-full" :class="column.dot" aria-hidden="true" />
            {{ column.title }}
            <span class="font-label ml-auto rounded-full bg-surface-container-highest px-2 py-0.5 text-xs text-on-surface-variant">
              {{ column.items.length }}
            </span>
          </h3>
          <p class="pl-4 text-xs text-on-surface-variant">{{ column.hint }}</p>
        </header>

        <div class="flex flex-1 flex-col gap-2">
          <article
            v-for="card in column.items"
            :key="card.key"
            :draggable="canAdvance(card) && busyKey !== card.key"
            class="group relative overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm ring-1 ring-outline-variant/40 outline-none transition-[box-shadow,opacity,transform] hover:-translate-y-px hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary"
            :class="[
              canAdvance(card) ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
              dragging?.key === card.key || busyKey === card.key ? 'opacity-50' : '',
            ]"
            role="button"
            tabindex="0"
            :aria-label="`Ver detalle: mesa ${card.attention.tableNumber}, ronda ${card.roundNumber}${delayLabel[delayOf(card)] ? `, ${delayLabel[delayOf(card)].toLowerCase()}` : ''}`"
            @click="emit('select', card)"
            @keydown.enter.self.prevent="emit('select', card)"
            @dragstart="onDragStart($event, card)"
            @dragend="onDragEnd"
          >
            <!-- Franja del color de la columna (estado); la demora la indica la etiqueta del tiempo -->
            <span class="absolute inset-y-0 left-0 w-1" :class="column.dot" aria-hidden="true" />

            <div class="space-y-3 py-3 pr-3 pl-4">
              <header class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <p class="font-headline text-lg leading-tight font-semibold whitespace-nowrap text-on-surface group-hover:text-primary">
                    Mesa {{ card.attention.tableNumber }}
                  </p>
                  <p class="mt-0.5 flex items-center gap-1 truncate text-xs text-on-surface-variant">
                    <svg class="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                      <path
                        v-if="card.createdBy"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
                      />
                      <path
                        v-else
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z"
                      />
                    </svg>
                    <span class="truncate">Ronda {{ card.roundNumber }} · {{ card.createdBy ?? 'QR' }}</span>
                  </p>
                </div>
                <span
                  class="font-label inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold whitespace-nowrap"
                  :class="
                    delayOf(card) === 'critical'
                      ? 'bg-error-container text-on-error-container'
                      : delayOf(card) === 'warning'
                        ? 'bg-warning-container text-on-warning-container'
                        : 'bg-surface-container text-on-surface-variant'
                  "
                  :title="delayLabel[delayOf(card)] || undefined"
                >
                  <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                  {{ formatElapsed(card.requestedAt, now).replace('hace ', '') }}
                </span>
              </header>

              <ul class="space-y-2">
                <li v-for="product in card.products" :key="product.id" class="flex gap-2">
                  <span
                    class="font-label flex h-5 min-w-6 shrink-0 items-center justify-center rounded-md bg-primary-fixed px-1 text-xs font-bold text-on-primary-fixed tabular-nums"
                  >
                    {{ product.quantity }}
                  </span>
                  <span class="min-w-0 text-sm leading-5 text-on-surface">
                    {{ product.name }}
                    <span
                      v-if="product.notes"
                      class="mt-1 flex w-fit items-center gap-1 rounded-md bg-tertiary-fixed/50 px-1.5 py-0.5 text-xs font-medium text-on-tertiary-container"
                    >
                      <svg class="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125"
                        />
                      </svg>
                      {{ product.notes }}
                    </span>
                  </span>
                </li>
              </ul>

              <footer class="flex items-center justify-between gap-2 border-t border-outline-variant/40 pt-2.5">
                <span class="text-xs whitespace-nowrap text-on-surface-variant">
                  {{ card.products.reduce((sum, product) => sum + product.quantity, 0) }}
                  {{ card.products.reduce((sum, product) => sum + product.quantity, 0) === 1 ? 'plato' : 'platos' }}
                </span>
                <button
                  v-if="canAdvance(card)"
                  type="button"
                  class="font-label inline-flex min-h-8 shrink-0 items-center gap-1 rounded-lg bg-primary px-3 text-xs font-semibold whitespace-nowrap text-on-primary shadow-sm transition-colors hover:bg-primary-container disabled:opacity-50"
                  :disabled="busyKey === card.key"
                  :aria-label="`${nextOrderedProductActionLabel(card.status)}: mesa ${card.attention.tableNumber}, pasa a ${orderedProductStatusLabel[nextOrderedProductStatus(card.status)!]}`"
                  @click.stop="advance(card)"
                  @keydown.enter.stop
                >
                  {{ busyKey === card.key ? 'Moviendo…' : nextOrderedProductActionLabel(card.status) }}
                  <span aria-hidden="true">→</span>
                </button>
              </footer>
            </div>
          </article>

          <p
            v-if="column.items.length === 0"
            class="flex flex-1 items-center justify-center rounded-xl border border-dashed border-outline-variant/70 px-3 py-8 text-center text-xs text-on-surface-variant"
          >
            {{ dragging && acceptsDrop(column.status) ? 'Suelta aquí' : 'Sin comandas' }}
          </p>
        </div>
      </section>
    </div>
  </div>
</template>
