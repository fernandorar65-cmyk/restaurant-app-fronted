<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'

import SkeletonBlock from '@/components/base/SkeletonBlock.vue'
import EmptyState from '@/components/base/EmptyState.vue'
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
import { delayLabel, delayLevel, delayRingClass, delayTextClass, KITCHEN_DELAY_MINUTES, statusSinceMap } from '@/modules/orders/rounds'
import type { DelayLevel } from '@/modules/orders/rounds'
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
const DARK_KEY = 'restaurant-cmr:kitchen-dark'
const isDark = ref(readDarkPreference())

function readDarkPreference(): boolean {
  try {
    return localStorage.getItem(DARK_KEY) === '1'
  } catch {
    return false
  }
}

function toggleDark(): void {
  isDark.value = !isDark.value

  try {
    localStorage.setItem(DARK_KEY, isDark.value ? '1' : '0')
  } catch {
    // Preferencia solo en memoria.
  }
}

const { restaurant, restaurantId, isLoading, loadError } = useSiteContext(loadQueue)

const staffName = computed(() => session.user?.name ?? 'Cocina')
const toPrepare = computed(() => items.value.filter((item) => item.product.status === 'confirmed'))
const inProgress = computed(() => items.value.filter((item) => item.product.status === 'preparing'))
const criticalCount = computed(() => items.value.filter((item) => itemDelay(item) === 'critical').length)

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

function itemDelay(item: KitchenItem): DelayLevel {
  return delayLevel(minutesSince(item.confirmedAt, now.value), KITCHEN_DELAY_MINUTES)
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
    class="w-full overflow-y-auto bg-background"
    :class="[isDark ? 'theme-dark' : '', isFullscreen ? 'h-dvh' : 'min-h-full']"
  >
    <div class="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 lg:px-8" :class="isFullscreen ? 'max-w-none' : ''">
      <SkeletonBlock v-if="isLoading" variant="page" />
      <p
        v-else-if="loadError"
        class="rounded-xl bg-error-container px-4 py-3 text-sm text-on-error-container"
        role="alert"
      >
        {{ loadError }}
      </p>

      <template v-else-if="restaurant">
        <SitePageHeader
          :restaurant="restaurant"
          section="Cocina"
          title="Cola de cocina"
          :description="`Del más antiguo al más nuevo. Ámbar a partir de ${KITCHEN_DELAY_MINUTES} min, rojo a partir de ${KITCHEN_DELAY_MINUTES * 2} min.`"
        >
          <template #actions>
            <span
              v-if="criticalCount > 0"
              class="font-label inline-flex min-h-11 items-center rounded-xl bg-error-container px-4 text-sm font-semibold text-on-error-container"
            >
              {{ criticalCount }} muy demorado(s)
            </span>
            <button
              type="button"
              class="font-label inline-flex min-h-11 items-center gap-2 rounded-xl bg-surface-container-lowest px-4 text-sm font-semibold text-on-surface shadow-sm hover:bg-surface-container"
              :aria-pressed="isDark"
              @click="toggleDark"
            >
              {{ isDark ? 'Tema claro' : 'Tema oscuro' }}
            </button>
            <button
              type="button"
              class="font-label inline-flex min-h-11 items-center rounded-xl bg-surface-container-lowest px-4 text-sm font-semibold text-on-surface shadow-sm hover:bg-surface-container"
              @click="toggleFullscreen"
            >
              {{ isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa' }}
            </button>
          </template>
        </SitePageHeader>

        <p v-if="actionError" class="rounded-xl bg-error-container px-4 py-3 text-sm text-on-error-container" role="alert">
          {{ actionError }}
        </p>

        <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
          <section
            v-for="column in [
              { id: 'todo', title: 'Por preparar', list: toPrepare, action: 'Iniciar preparación', tone: 'bg-surface-container text-on-surface' },
              { id: 'doing', title: 'En preparación', list: inProgress, action: 'Marcar listo', tone: 'bg-primary-fixed text-on-primary-fixed' },
            ]"
            :key="column.id"
            class="space-y-3"
          >
            <h2 class="font-headline flex items-center gap-2 text-2xl font-semibold text-on-surface">
              {{ column.title }}
              <span class="rounded-full px-3 py-0.5 text-base font-bold" :class="column.tone">{{ column.list.length }}</span>
            </h2>

            <EmptyState
              v-if="column.list.length === 0"
              icon="fire"
              :title="column.id === 'todo' ? 'Nada por empezar' : 'Nada en el fuego'"
            />

            <article
              v-for="item in column.list"
              :key="item.product.id"
              class="space-y-3 rounded-3xl bg-surface-container-lowest p-5 shadow-sm ring-2"
              :class="delayRingClass[itemDelay(item)]"
            >
              <div class="flex items-center justify-between gap-3">
                <span class="font-headline text-3xl font-bold text-on-surface">Mesa {{ item.tableNumber }}</span>
                <span class="font-label text-base font-semibold" :class="delayTextClass[itemDelay(item)]">
                  <template v-if="delayLabel[itemDelay(item)]">{{ delayLabel[itemDelay(item)] }} · </template>{{ formatElapsed(item.confirmedAt, now) }}
                </span>
              </div>
              <p class="text-2xl leading-snug font-semibold text-on-surface">
                <span class="text-primary">{{ item.product.quantity }}×</span> {{ item.product.name }}
              </p>
              <p v-if="item.product.notes" class="rounded-xl bg-warning-container px-4 py-3 text-lg font-semibold text-on-warning-container">
                ⚠ {{ item.product.notes }}
              </p>
              <p v-if="item.product.status === 'preparing'" class="text-sm text-on-surface-variant">
                En preparación {{ formatElapsed(item.since, now) }}
              </p>
              <button
                type="button"
                class="font-label min-h-14 w-full rounded-2xl text-lg font-semibold transition-opacity disabled:opacity-50"
                :class="item.product.status === 'confirmed' ? 'bg-on-surface text-surface hover:opacity-90' : 'bg-success text-on-success hover:opacity-90'"
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
  </div>
</template>
