<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'

import SitePageHeader from '@/components/base/SitePageHeader.vue'
import { useNow } from '@/composables/useNow'
import { usePageTitle } from '@/composables/usePageTitle'
import { useSiteContext } from '@/composables/useSiteContext'
import {
  ConflictError,
  errorMessage,
  fetchAllStatusHistory,
  fetchAttentionsWithProductsBySite,
  isAttentionActive,
  updateOrderedProductStatus,
} from '@/modules/orders/api'
import { KITCHEN_DELAY_MINUTES, statusSinceMap } from '@/modules/orders/rounds'
import type { OrderedProduct } from '@/modules/orders/types'
import type { RestaurantSite } from '@/modules/restaurants/types'
import { useSessionStore } from '@/stores/session'
import { useSiteActivityStore } from '@/stores/site-activity'
import { useToastStore } from '@/stores/toast'
import { formatElapsed, minutesSince } from '@/utils/time'

usePageTitle('Cocina')

interface KitchenItem {
  product: OrderedProduct
  tableNumber: string
  /** Desde cuándo está en el estado actual (confirmado o en preparación). */
  since: string
  /** Desde cuándo se confirmó: mide la demora total en cocina. */
  confirmedAt: string
}

const session = useSessionStore()
const activity = useSiteActivityStore()
const toast = useToastStore()
const now = useNow(15000)

const items = ref<KitchenItem[]>([])
const busyId = ref<string | null>(null)
const actionError = ref<string | null>(null)
const containerEl = ref<HTMLElement | null>(null)
const isFullscreen = ref(false)

const { restaurant, restaurantId, isLoading, loadError } = useSiteContext(loadQueue)

const staffName = computed(() => session.user?.name ?? 'Cocina')
const toPrepare = computed(() => items.value.filter((item) => item.product.status === 'confirmed'))
const inProgress = computed(() => items.value.filter((item) => item.product.status === 'preparing'))

async function loadQueue(site?: RestaurantSite): Promise<void> {
  const id = site?.id ?? restaurantId.value

  if (!id) {
    return
  }

  const [attentions, history] = await Promise.all([fetchAttentionsWithProductsBySite(id), fetchAllStatusHistory()])
  const since = statusSinceMap(history)
  const confirmedAt = new Map<string, string>()

  for (const entry of history) {
    if (entry.entityType === 'orderedProduct' && entry.toStatus === 'confirmed') {
      confirmedAt.set(entry.entityId, entry.changedAt)
    }
  }

  items.value = attentions
    .filter(isAttentionActive)
    .flatMap((attention) =>
      attention.products
        .filter((product) => product.status === 'confirmed' || product.status === 'preparing')
        .map((product) => ({
          product,
          tableNumber: attention.tableNumber,
          since: since.get(product.id) ?? product.requestedAt,
          confirmedAt: confirmedAt.get(product.id) ?? product.requestedAt,
        })),
    )
    .sort((a, b) => (a.confirmedAt < b.confirmedAt ? -1 : 1))
}

async function reload(): Promise<void> {
  try {
    await loadQueue()
  } catch (error) {
    actionError.value = errorMessage(error, 'No se pudo actualizar la cola.')
  }
}

function isDelayed(item: KitchenItem): boolean {
  return minutesSince(item.confirmedAt, now.value) >= KITCHEN_DELAY_MINUTES
}

async function advance(item: KitchenItem): Promise<void> {
  const toStatus = item.product.status === 'confirmed' ? 'preparing' : 'ready'
  busyId.value = item.product.id
  actionError.value = null

  try {
    await updateOrderedProductStatus(item.product, toStatus, staffName.value)

    if (toStatus === 'ready') {
      toast.show(`Mesa ${item.tableNumber}: ${item.product.name} listo`, { tone: 'success' })
    }
  } catch (error) {
    actionError.value = errorMessage(error, 'No se pudo actualizar la comanda.')

    if (!(error instanceof ConflictError)) {
      return
    }
  } finally {
    busyId.value = null
  }

  await reload()
  void activity.refresh()
}

async function toggleFullscreen(): Promise<void> {
  if (document.fullscreenElement) {
    await document.exitFullscreen()
  } else {
    await containerEl.value?.requestFullscreen()
  }
}

function onFullscreenChange(): void {
  isFullscreen.value = document.fullscreenElement !== null
}

document.addEventListener('fullscreenchange', onFullscreenChange)
onUnmounted(() => document.removeEventListener('fullscreenchange', onFullscreenChange))

watch(
  () => activity.revision,
  () => void reload(),
)
</script>

<template>
  <div
    ref="containerEl"
    class="mx-auto w-full max-w-7xl space-y-6 overflow-y-auto bg-[#f8f9fa] px-4 py-6 lg:px-8"
    :class="isFullscreen ? 'h-screen max-w-none' : ''"
  >
    <p v-if="isLoading" class="text-sm text-on-surface-variant">Cargando cola de cocina…</p>
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
        section="Cocina"
        title="Cola de cocina"
        :description="`Productos confirmados, del más antiguo al más nuevo. Se marca en rojo lo que lleva más de ${KITCHEN_DELAY_MINUTES} min.`"
      >
        <template #actions>
          <button
            type="button"
            class="font-label rounded-xl bg-surface-container-lowest px-4 py-2.5 text-xs font-semibold text-on-surface shadow-sm hover:bg-surface-container"
            @click="toggleFullscreen"
          >
            {{ isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa (tablet)' }}
          </button>
        </template>
      </SitePageHeader>

      <p v-if="actionError" class="rounded-lg bg-error-container px-3 py-2 text-sm text-on-error-container" role="alert">
        {{ actionError }}
      </p>

      <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
        <section v-for="column in [
          { id: 'todo', title: 'Por preparar', list: toPrepare, action: 'Iniciar preparación', tone: 'bg-surface-container' },
          { id: 'doing', title: 'En preparación', list: inProgress, action: 'Marcar listo', tone: 'bg-primary-fixed' },
        ]" :key="column.id" class="space-y-3">
          <h2 class="font-headline flex items-center gap-2 text-xl font-semibold text-on-surface">
            {{ column.title }}
            <span class="rounded-full px-2.5 py-0.5 text-sm font-bold" :class="column.tone">{{ column.list.length }}</span>
          </h2>

          <p v-if="column.list.length === 0" class="rounded-2xl bg-surface-container-lowest p-6 text-center text-sm text-on-surface-variant shadow-sm">
            Nada por aquí.
          </p>

          <article
            v-for="item in column.list"
            :key="item.product.id"
            class="space-y-3 rounded-2xl bg-surface-container-lowest p-5 shadow-sm ring-2"
            :class="isDelayed(item) ? 'ring-error' : 'ring-transparent'"
          >
            <div class="flex items-center justify-between gap-3">
              <span class="font-headline text-2xl font-bold text-on-surface">Mesa {{ item.tableNumber }}</span>
              <span class="font-label text-sm font-semibold" :class="isDelayed(item) ? 'text-error' : 'text-on-surface-variant'">
                {{ formatElapsed(item.confirmedAt, now) }}
              </span>
            </div>
            <p class="text-xl leading-snug font-semibold text-on-surface">
              <span class="text-primary">{{ item.product.quantity }}×</span> {{ item.product.name }}
            </p>
            <p v-if="item.product.notes" class="rounded-lg bg-tertiary-fixed px-3 py-2 text-base font-semibold text-on-tertiary-container">
              {{ item.product.notes }}
            </p>
            <p v-if="item.product.status === 'preparing'" class="text-xs text-on-surface-variant">
              En preparación {{ formatElapsed(item.since, now) }}
            </p>
            <button
              type="button"
              class="font-label w-full rounded-xl py-3.5 text-base font-semibold disabled:opacity-50"
              :class="item.product.status === 'confirmed' ? 'bg-on-surface text-surface hover:opacity-90' : 'bg-emerald-700 text-white hover:bg-emerald-800'"
              :disabled="busyId === item.product.id"
              @click="advance(item)"
            >
              {{ column.action }}
            </button>
          </article>
        </section>
      </div>
    </template>
  </div>
</template>
