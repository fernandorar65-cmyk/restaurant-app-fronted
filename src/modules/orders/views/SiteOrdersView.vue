<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import SitePageHeader from '@/components/base/SitePageHeader.vue'
import { useNow } from '@/composables/useNow'
import { usePageTitle } from '@/composables/usePageTitle'
import { useSiteContext } from '@/composables/useSiteContext'
import {
  errorMessage,
  fetchAttentionsWithProductsBySite,
  isAttentionActive,
  updateOrderedProductStatus,
  updateOrderedProductsStatus,
} from '@/modules/orders/api'
import AttentionCard from '@/modules/orders/components/AttentionCard.vue'
import AttentionDialog from '@/modules/orders/components/AttentionDialog.vue'
import StaffOrderDialog from '@/modules/orders/components/StaffOrderDialog.vue'
import { groupByRound, INCOMING_DELAY_MINUTES } from '@/modules/orders/rounds'
import type { AttentionWithProducts, OrderedProduct } from '@/modules/orders/types'
import type { RestaurantSite } from '@/modules/restaurants/types'
import { useSessionStore } from '@/stores/session'
import { useSiteActivityStore } from '@/stores/site-activity'
import { useToastStore } from '@/stores/toast'
import { formatMoney } from '@/utils/money'
import { formatElapsed, minutesSince } from '@/utils/time'

usePageTitle('Pedidos entrantes')

const route = useRoute()
const router = useRouter()
const session = useSessionStore()
const activity = useSiteActivityStore()
const toast = useToastStore()
const now = useNow(20000)

const attentions = ref<AttentionWithProducts[]>([])
const showClosed = ref(false)
const rejectingId = ref<string | null>(null)
const rejectionReason = ref('')
const busyKey = ref<string | null>(null)
const actionError = ref<string | null>(null)
const staffOrderTable = ref<string | null | undefined>(undefined)

const { restaurant, restaurantId, currency, isLoading, loadError } = useSiteContext(loadAttentions)

const staffName = computed(() => session.user?.name ?? 'Personal')

async function loadAttentions(site?: RestaurantSite): Promise<void> {
  const id = site?.id ?? restaurantId.value

  if (id) {
    attentions.value = await fetchAttentionsWithProductsBySite(id)
  }
}

async function reload(): Promise<void> {
  try {
    await loadAttentions()
  } catch (error) {
    actionError.value = errorMessage(error, 'No se pudieron actualizar los pedidos.')
  }
}

interface IncomingRound {
  key: string
  attention: AttentionWithProducts
  roundNumber: number
  requestedAt: string
  createdBy: string | null
  products: OrderedProduct[]
}

/** Rondas con productos sin confirmar, de la más antigua a la más nueva. */
const incomingRounds = computed<IncomingRound[]>(() =>
  attentions.value
    .filter(isAttentionActive)
    .flatMap((attention) =>
      groupByRound(attention.products).map((round, index) => ({
        key: round.batchId,
        attention,
        roundNumber: index + 1,
        requestedAt: round.requestedAt,
        createdBy: round.createdBy,
        products: round.products.filter((product) => product.status === 'sent'),
      })),
    )
    .filter((round) => round.products.length > 0)
    .sort((a, b) => (a.requestedAt < b.requestedAt ? -1 : 1)),
)

const incomingCount = computed(() => incomingRounds.value.reduce((sum, round) => sum + round.products.length, 0))

const visibleAttentions = computed(() =>
  showClosed.value ? attentions.value : attentions.value.filter(isAttentionActive),
)

const selectedAttention = computed(() => {
  const id = route.params.attentionId
  return typeof id === 'string' ? (attentions.value.find((attention) => attention.id === id) ?? null) : null
})

function isDelayed(round: IncomingRound): boolean {
  return minutesSince(round.requestedAt, now.value) >= INCOMING_DELAY_MINUTES
}

function reportFailures(failed: Array<{ message: string }>): void {
  if (failed.length > 0) {
    toast.show('Algunos productos no se actualizaron', { message: failed[0]?.message, tone: 'warning' })
  }
}

async function confirmRound(round: IncomingRound): Promise<void> {
  busyKey.value = round.key
  actionError.value = null

  try {
    const result = await updateOrderedProductsStatus(round.products, 'confirmed', staffName.value)
    reportFailures(result.failed)

    if (result.updated.length > 0) {
      toast.show(`Mesa ${round.attention.tableNumber}: ${result.updated.length} producto(s) enviados a cocina`, {
        tone: 'success',
      })
    }
  } finally {
    busyKey.value = null
    await reload()
  }
}

async function confirmProduct(product: OrderedProduct): Promise<void> {
  busyKey.value = product.id
  actionError.value = null

  try {
    await updateOrderedProductStatus(product, 'confirmed', staffName.value)
  } catch (error) {
    actionError.value = errorMessage(error, 'No se pudo confirmar el producto.')
  } finally {
    busyKey.value = null
    await reload()
  }
}

function startReject(product: OrderedProduct): void {
  rejectingId.value = product.id
  rejectionReason.value = ''
}

async function confirmReject(product: OrderedProduct): Promise<void> {
  if (!rejectionReason.value.trim()) {
    return
  }

  busyKey.value = product.id
  actionError.value = null

  try {
    await updateOrderedProductStatus(product, 'rejected', staffName.value, rejectionReason.value.trim())
    rejectingId.value = null
  } catch (error) {
    actionError.value = errorMessage(error, 'No se pudo rechazar el producto.')
  } finally {
    busyKey.value = null
    await reload()
  }
}

async function openAttention(attention: AttentionWithProducts): Promise<void> {
  if (restaurantId.value) {
    await router.push({ name: 'site-order-detail', params: { restaurantId: restaurantId.value, attentionId: attention.id } })
  }
}

async function closeAttention(): Promise<void> {
  if (restaurantId.value) {
    await router.push({ name: 'site-orders', params: { restaurantId: restaurantId.value } })
  }
}

function openStaffOrder(tableNumber: string | null): void {
  staffOrderTable.value = tableNumber
}

async function handleStaffOrderCreated(): Promise<void> {
  toast.show('Pedido registrado', { message: 'Los productos entraron confirmados y ya están en cocina.', tone: 'success' })
  await reload()
  void activity.refresh()
}

watch(
  () => activity.revision,
  () => void reload(),
)
</script>

<template>
  <div class="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 lg:px-8">
    <p v-if="isLoading" class="text-sm text-on-surface-variant">Cargando pedidos…</p>
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
        section="Pedidos entrantes"
        title="Pedidos entrantes"
        description="Revisa cada ronda que llega desde las mesas: confirma lo que pasa a cocina o recházalo indicando el motivo."
      >
        <template #actions>
          <button
            type="button"
            class="font-label rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-on-primary shadow-sm hover:bg-primary-container"
            @click="openStaffOrder(null)"
          >
            + Pedido manual
          </button>
        </template>
      </SitePageHeader>

      <p v-if="actionError" class="rounded-lg bg-error-container px-3 py-2 text-sm text-on-error-container" role="alert">
        {{ actionError }}
      </p>

      <div class="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <section class="space-y-3 lg:col-span-7">
          <h2 class="font-headline flex items-center gap-2 text-lg font-semibold text-on-surface">
            Por confirmar
            <span v-if="incomingCount > 0" class="rounded-full bg-error px-2 py-0.5 text-xs font-bold text-on-error">
              {{ incomingCount }}
            </span>
          </h2>

          <p v-if="incomingRounds.length === 0" class="rounded-2xl bg-surface-container-lowest p-6 text-center text-sm text-on-surface-variant shadow-sm">
            No hay pedidos esperando confirmación.
          </p>

          <article
            v-for="round in incomingRounds"
            :key="round.key"
            class="space-y-3 rounded-2xl bg-surface-container-lowest p-4 shadow-sm ring-1"
            :class="isDelayed(round) ? 'ring-error/60' : 'ring-transparent'"
          >
            <header class="flex flex-wrap items-center justify-between gap-2">
              <div class="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  class="font-headline text-base font-bold text-on-surface hover:text-primary"
                  @click="openAttention(round.attention)"
                >
                  Mesa {{ round.attention.tableNumber }}
                </button>
                <span class="font-label rounded bg-surface-container px-1.5 py-0.5 text-[10px] font-semibold text-on-surface-variant">
                  Ronda {{ round.roundNumber }}
                </span>
                <span class="font-label rounded px-1.5 py-0.5 text-[10px] font-semibold" :class="round.createdBy ? 'bg-primary-fixed text-on-primary-fixed' : 'bg-secondary-container text-on-secondary-container'">
                  {{ round.createdBy ? `Cargado por ${round.createdBy}` : 'QR' }}
                </span>
              </div>
              <span class="font-label text-[11px] font-semibold" :class="isDelayed(round) ? 'text-error' : 'text-on-surface-variant'">
                {{ isDelayed(round) ? 'Demorado · ' : '' }}{{ formatElapsed(round.requestedAt, now) }}
              </span>
            </header>

            <ul class="space-y-2">
              <li v-for="product in round.products" :key="product.id" class="space-y-2 rounded-xl bg-surface p-3">
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <p class="text-sm font-semibold text-on-surface">{{ product.quantity }}× {{ product.name }}</p>
                    <p v-if="product.notes" class="text-xs font-medium text-tertiary">Nota: {{ product.notes }}</p>
                  </div>
                  <span class="shrink-0 text-sm font-semibold text-on-surface">{{ formatMoney(product.subtotal, currency) }}</span>
                </div>

                <div v-if="rejectingId === product.id" class="space-y-2 rounded-lg bg-error-container/40 p-2.5">
                  <input
                    v-model="rejectionReason"
                    class="w-full rounded-lg bg-surface-container-lowest px-3 py-1.5 text-xs text-on-surface shadow-inner outline-none ring-1 ring-transparent focus:ring-primary"
                    placeholder="Motivo del rechazo (ej: agotado)"
                    type="text"
                    @keydown.enter.prevent="confirmReject(product)"
                  />
                  <div class="flex justify-end gap-2">
                    <button type="button" class="font-label text-[11px] font-semibold text-on-surface-variant" @click="rejectingId = null">
                      Volver
                    </button>
                    <button
                      type="button"
                      class="font-label rounded-lg bg-error px-2.5 py-1 text-[11px] font-semibold text-on-error disabled:opacity-50"
                      :disabled="!rejectionReason.trim() || busyKey === product.id"
                      @click="confirmReject(product)"
                    >
                      Rechazar
                    </button>
                  </div>
                </div>
                <div v-else class="flex justify-end gap-2">
                  <button
                    type="button"
                    class="font-label rounded-lg bg-error-container px-2.5 py-1 text-[11px] font-semibold text-on-error-container hover:bg-error/20"
                    @click="startReject(product)"
                  >
                    Rechazar
                  </button>
                  <button
                    type="button"
                    class="font-label rounded-lg bg-surface-container px-2.5 py-1 text-[11px] font-semibold text-on-surface hover:bg-surface-container-high disabled:opacity-50"
                    :disabled="busyKey === product.id"
                    @click="confirmProduct(product)"
                  >
                    Confirmar
                  </button>
                </div>
              </li>
            </ul>

            <button
              type="button"
              class="font-label w-full rounded-xl bg-primary py-2.5 text-xs font-semibold text-on-primary hover:bg-primary-container disabled:opacity-50"
              :disabled="busyKey === round.key"
              @click="confirmRound(round)"
            >
              {{ busyKey === round.key ? 'Confirmando…' : `Confirmar ronda (${round.products.length})` }}
            </button>
          </article>
        </section>

        <section class="space-y-3 lg:col-span-5">
          <div class="flex items-center justify-between gap-2">
            <h2 class="font-headline text-lg font-semibold text-on-surface">Atenciones</h2>
            <button
              type="button"
              class="font-label rounded-full px-3 py-1.5 text-[11px] font-semibold"
              :class="showClosed ? 'bg-primary-container text-on-primary-container' : 'bg-surface-container text-on-surface-variant'"
              @click="showClosed = !showClosed"
            >
              {{ showClosed ? 'Mostrando todas' : 'Mostrar cerradas' }}
            </button>
          </div>
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <AttentionCard
              v-for="attention in visibleAttentions"
              :key="attention.id"
              :attention="attention"
              :currency="currency"
              @select="openAttention(attention)"
            />
          </div>
          <p v-if="visibleAttentions.length === 0" class="text-sm text-on-surface-variant">No hay atenciones para mostrar.</p>
        </section>
      </div>

      <AttentionDialog
        v-if="selectedAttention"
        :key="selectedAttention.id"
        :attention="selectedAttention"
        :currency="currency"
        :timezone="restaurant.timezone"
        @close="closeAttention"
        @changed="reload"
        @add-products="openStaffOrder(selectedAttention.tableNumber)"
      />

      <StaffOrderDialog
        v-if="staffOrderTable !== undefined"
        :restaurant="restaurant"
        :preset-table-number="staffOrderTable"
        @close="staffOrderTable = undefined"
        @created="handleStaffOrderCreated"
      />
    </template>
  </div>
</template>
