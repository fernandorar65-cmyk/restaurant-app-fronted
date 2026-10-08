<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import EmptyState from '@/components/base/EmptyState.vue'
import SkeletonBlock from '@/components/base/SkeletonBlock.vue'
import SitePageHeader from '@/components/base/SitePageHeader.vue'
import { useNow } from '@/composables/useNow'
import { usePageTitle } from '@/composables/usePageTitle'
import { useSiteContext } from '@/composables/useSiteContext'
import {
  errorMessage,
  fetchAllStatusHistory,
  fetchAttentionsWithProductsBySite,
  isAttentionActive,
  updateOrderedProductStatus,
  updateOrderedProductsStatus,
} from '@/modules/orders/api'
import { delayLabel, delayLevel, delayRingClass, delayTextClass, DELIVERY_DELAY_MINUTES, statusSinceMap } from '@/modules/orders/rounds'
import type { DelayLevel } from '@/modules/orders/rounds'
import type { OrderedProduct } from '@/modules/orders/types'
import type { RestaurantSite } from '@/modules/restaurants/types'
import { useSessionStore } from '@/stores/session'
import { useSiteActivityStore } from '@/stores/site-activity'
import { useToastStore } from '@/stores/toast'
import { formatElapsed, minutesSince } from '@/utils/time'

usePageTitle('Entregas')

interface TableDeliveries {
  tableNumber: string
  attentionId: string
  items: Array<{ product: OrderedProduct; readyAt: string }>
  oldestReadyAt: string
  /** Productos de la mesa que todavía están en cocina. */
  stillCooking: number
}

const session = useSessionStore()
const activity = useSiteActivityStore()
const toast = useToastStore()
const now = useNow(15000)

const tables = ref<TableDeliveries[]>([])
const busyKey = ref<string | null>(null)
const actionError = ref<string | null>(null)

const { restaurant, restaurantId, isLoading, loadError } = useSiteContext(loadDeliveries)

const staffName = computed(() => session.user?.name ?? 'Sala')
const readyCount = computed(() => tables.value.reduce((sum, table) => sum + table.items.length, 0))

async function loadDeliveries(site?: RestaurantSite): Promise<void> {
  const id = site?.id ?? restaurantId.value

  if (!id) {
    return
  }

  const [attentions, history] = await Promise.all([fetchAttentionsWithProductsBySite(id), fetchAllStatusHistory()])
  const since = statusSinceMap(history)

  tables.value = attentions
    .filter(isAttentionActive)
    .map((attention) => {
      const items = attention.products
        .filter((product) => product.status === 'ready')
        .map((product) => ({ product, readyAt: since.get(product.id) ?? product.requestedAt }))
        .sort((a, b) => (a.readyAt < b.readyAt ? -1 : 1))

      return {
        tableNumber: attention.tableNumber,
        attentionId: attention.id,
        items,
        oldestReadyAt: items[0]?.readyAt ?? '',
        stillCooking: attention.products.filter((product) => product.status === 'confirmed' || product.status === 'preparing').length,
      }
    })
    .filter((table) => table.items.length > 0)
    .sort((a, b) => (a.oldestReadyAt < b.oldestReadyAt ? -1 : 1))
}

async function reload(): Promise<void> {
  try {
    await loadDeliveries()
  } catch (error) {
    actionError.value = errorMessage(error, 'No se pudieron actualizar las entregas.')
  }
}

function waitLevel(readyAt: string): DelayLevel {
  return delayLevel(minutesSince(readyAt, now.value), DELIVERY_DELAY_MINUTES)
}

async function deliver(product: OrderedProduct): Promise<void> {
  busyKey.value = product.id
  actionError.value = null

  try {
    await updateOrderedProductStatus(product, 'delivered', staffName.value)
  } catch (error) {
    actionError.value = errorMessage(error, 'No se pudo marcar como entregado.')
  } finally {
    busyKey.value = null
    await reload()
    void activity.refresh()
  }
}

async function deliverTable(table: TableDeliveries): Promise<void> {
  busyKey.value = table.attentionId
  actionError.value = null

  try {
    const result = await updateOrderedProductsStatus(
      table.items.map((item) => item.product),
      'delivered',
      staffName.value,
    )

    if (result.failed.length > 0) {
      toast.show('Algunos productos no se marcaron', { message: result.failed[0]?.message, tone: 'warning' })
    } else {
      toast.show(`Mesa ${table.tableNumber} servida`, { tone: 'success' })
    }
  } finally {
    busyKey.value = null
    await reload()
    void activity.refresh()
  }
}

watch(
  () => activity.revision,
  () => void reload(),
)
</script>

<template>
  <div class="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 lg:px-8">
    <SkeletonBlock v-if="isLoading" variant="page" />
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
        section="Entregas"
        title="Listos para servir"
        :description="`${readyCount} producto(s) esperan en el pase. Ámbar a partir de ${DELIVERY_DELAY_MINUTES} min, rojo a partir de ${DELIVERY_DELAY_MINUTES * 2} min.`"
      />

      <p v-if="actionError" class="rounded-lg bg-error-container px-3 py-2 text-sm text-on-error-container" role="alert">
        {{ actionError }}
      </p>

      <EmptyState
        v-if="tables.length === 0"
        icon="check"
        title="Nada esperando en el pase"
        message="Cuando cocina marque un producto como listo aparecerá aquí agrupado por mesa."
      />

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <article
          v-for="table in tables"
          :key="table.attentionId"
          class="space-y-3 rounded-3xl bg-surface-container-lowest p-5 shadow-sm ring-2"
          :class="delayRingClass[waitLevel(table.oldestReadyAt)]"
        >
          <header class="flex items-center justify-between gap-2">
            <span class="font-headline text-2xl font-bold text-on-surface">Mesa {{ table.tableNumber }}</span>
            <span class="font-label text-sm font-semibold" :class="delayTextClass[waitLevel(table.oldestReadyAt)]">
              <template v-if="delayLabel[waitLevel(table.oldestReadyAt)]">{{ delayLabel[waitLevel(table.oldestReadyAt)] }} · </template>Listo {{ formatElapsed(table.oldestReadyAt, now) }}
            </span>
          </header>

          <ul class="space-y-2">
            <li v-for="item in table.items" :key="item.product.id" class="flex items-center justify-between gap-3 rounded-xl bg-surface p-3">
              <div class="min-w-0">
                <p class="text-base font-semibold text-on-surface">{{ item.product.quantity }}× {{ item.product.name }}</p>
                <p v-if="item.product.notes" class="text-xs font-medium text-tertiary">{{ item.product.notes }}</p>
              </div>
              <button
                type="button"
                class="font-label shrink-0 rounded-lg bg-surface-container px-3 py-2 text-xs font-semibold text-on-surface hover:bg-surface-container-high disabled:opacity-50"
                :disabled="busyKey === item.product.id"
                @click="deliver(item.product)"
              >
                Entregado
              </button>
            </li>
          </ul>

          <p v-if="table.stillCooking > 0" class="text-xs text-on-surface-variant">
            {{ table.stillCooking }} producto(s) de esta mesa siguen en cocina.
          </p>

          <button
            type="button"
            class="font-label min-h-12 w-full rounded-xl bg-success text-base font-semibold text-on-success hover:opacity-90 disabled:opacity-50"
            :disabled="busyKey === table.attentionId"
            @click="deliverTable(table)"
          >
            Entregar todo a la mesa {{ table.tableNumber }}
          </button>
        </article>
      </div>
    </template>
  </div>
</template>
