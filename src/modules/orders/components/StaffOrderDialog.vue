<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'

import { fetchCustomerMenu } from '@/modules/menus/api'
import type { MenuCategory, MenuProduct } from '@/modules/menus/types'
import {
  addOrderedProducts,
  errorMessage,
  fetchAttentionsBySite,
  isAttentionActive,
  openOrReuseAttention,
  validateOrderItems,
} from '@/modules/orders/api'
import type { Attention } from '@/modules/orders/types'
import { fetchSiteOperation } from '@/modules/restaurants/api'
import { tableStatusLabel } from '@/modules/restaurants/site-labels'
import type { LiveTable, RestaurantSite } from '@/modules/restaurants/types'
import { useSessionStore } from '@/stores/session'
import { formatMoney } from '@/utils/money'
import { createId } from '@/utils/time'

const props = defineProps<{
  restaurant: RestaurantSite
  presetTableNumber?: string | null
}>()

const emit = defineEmits<{
  close: []
  created: [attentionId: string]
}>()

interface DraftLine {
  product: MenuProduct
  quantity: number
  notes: string
}

const session = useSessionStore()
const dialogEl = ref<HTMLDialogElement | null>(null)
const tables = ref<LiveTable[]>([])
const activeAttentions = ref<Attention[]>([])
const categories = ref<MenuCategory[]>([])
const products = ref<MenuProduct[]>([])
const tableNumber = ref<string>(props.presetTableNumber ?? '')
const search = ref('')
const lines = ref<DraftLine[]>([])
const isLoading = ref(true)
const isSubmitting = ref(false)
const formError = ref<string | null>(null)
/** Una sola clave por pedido: si se reintenta tras un error de red no se duplican productos. */
let batchId = createId('batch')

const staffName = computed(() => session.user?.name ?? 'Personal')

const selectedTable = computed(() => tables.value.find((table) => table.number === tableNumber.value) ?? null)
const selectedAttention = computed(
  () => activeAttentions.value.find((attention) => attention.tableNumber === tableNumber.value) ?? null,
)

const filteredProducts = computed(() => {
  const query = search.value.trim().toLowerCase()
  return products.value.filter((product) => !query || product.name.toLowerCase().includes(query))
})

const productsByCategory = computed(() =>
  categories.value
    .map((category) => ({
      category,
      items: filteredProducts.value.filter((product) => product.categoryId === category.id),
    }))
    .filter((group) => group.items.length > 0),
)

const total = computed(() => lines.value.reduce((sum, line) => sum + line.product.price * line.quantity, 0))

function quantityOf(productId: string): number {
  return lines.value.find((line) => line.product.id === productId)?.quantity ?? 0
}

function changeQuantity(product: MenuProduct, delta: number): void {
  const line = lines.value.find((item) => item.product.id === product.id)

  if (!line) {
    if (delta > 0) {
      lines.value = [...lines.value, { product, quantity: delta, notes: '' }]
    }
    return
  }

  line.quantity += delta

  if (line.quantity <= 0) {
    lines.value = lines.value.filter((item) => item.product.id !== product.id)
  }
}

function tableOptionLabel(table: LiveTable): string {
  const attention = activeAttentions.value.find((item) => item.tableNumber === table.number)
  const status = table.status === 'active' ? '' : ` · ${tableStatusLabel[table.status]}`
  return `Mesa ${table.number}${attention ? ' · atención abierta' : ''}${status}`
}

function closeDialog(): void {
  dialogEl.value?.close()
}

async function submit(): Promise<void> {
  if (!tableNumber.value || lines.value.length === 0) {
    return
  }

  isSubmitting.value = true
  formError.value = null

  try {
    const issues = await validateOrderItems(
      props.restaurant.id,
      lines.value.map((line) => ({ productId: line.product.id, name: line.product.name, unitPrice: line.product.price })),
    )

    if (issues.length > 0) {
      formError.value = `Revisa el pedido: ${issues.map((issue) => issue.name).join(', ')} ya no está disponible o cambió de precio.`
      await loadData()
      return
    }

    const attention = await openOrReuseAttention(props.restaurant.id, tableNumber.value, { userName: staffName.value })
    await addOrderedProducts(
      attention,
      lines.value.map((line) => ({
        productId: line.product.id,
        name: line.product.name,
        unitPrice: line.product.price,
        quantity: line.quantity,
        notes: line.notes.trim(),
      })),
      { batchId, createdBy: staffName.value, customerId: null },
    )

    batchId = createId('batch')
    emit('created', attention.id)
    closeDialog()
  } catch (error) {
    formError.value = errorMessage(error, 'No se pudo registrar el pedido. Inténtalo de nuevo.')
  } finally {
    isSubmitting.value = false
  }
}

async function loadData(): Promise<void> {
  isLoading.value = true

  try {
    const [operation, attentions, menu] = await Promise.all([
      fetchSiteOperation(props.restaurant.id),
      fetchAttentionsBySite(props.restaurant.id),
      fetchCustomerMenu(props.restaurant.id),
    ])
    tables.value = operation?.tables ?? []
    activeAttentions.value = attentions.filter(isAttentionActive)
    categories.value = menu.categories
    products.value = menu.products
  } catch (error) {
    formError.value = errorMessage(error, 'No se pudo cargar la carta.')
  } finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  await nextTick()
  dialogEl.value?.showModal()
  await loadData()
})
</script>

<template>
  <dialog
    ref="dialogEl"
    class="m-auto w-[min(100%-1.5rem,40rem)] overflow-hidden rounded-2xl bg-surface-container-lowest p-0 text-on-surface shadow-[0_24px_64px_rgba(27,28,29,0.18)] backdrop:bg-on-surface/45"
    aria-labelledby="staff-order-title"
    @close="emit('close')"
  >
    <div class="flex max-h-[min(92vh,820px)] flex-col">
      <header class="flex items-start justify-between gap-4 px-5 pt-5 pb-3 sm:px-6">
        <div>
          <p class="font-label text-[11px] font-semibold tracking-widest text-tertiary uppercase">Pedido manual</p>
          <h2 id="staff-order-title" class="font-headline mt-0.5 text-2xl leading-tight font-semibold">
            Cargar pedido para una mesa
          </h2>
          <p class="mt-1 text-xs text-on-surface-variant">Para comensales que no usan el QR. Queda registrado a nombre de {{ staffName }}.</p>
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
        <p v-if="isLoading" class="text-sm text-on-surface-variant">Cargando carta y mesas…</p>

        <template v-else>
          <label class="block space-y-1">
            <span class="font-label text-[11px] font-semibold tracking-wide text-on-surface-variant uppercase">Mesa</span>
            <select
              v-model="tableNumber"
              class="w-full rounded-lg bg-surface px-3 py-2 text-sm text-on-surface shadow-inner outline-none ring-1 ring-transparent focus:ring-primary"
            >
              <option value="" disabled>Elige una mesa</option>
              <option v-for="table in tables" :key="table.number" :value="table.number" :disabled="table.status !== 'active'">
                {{ tableOptionLabel(table) }}
              </option>
            </select>
          </label>
          <p v-if="selectedAttention" class="rounded-lg bg-primary-fixed px-3 py-2 text-xs text-on-primary-fixed">
            Se agregará a la atención abierta de la mesa {{ selectedAttention.tableNumber }}.
          </p>
          <p v-else-if="selectedTable" class="rounded-lg bg-surface-container px-3 py-2 text-xs text-on-surface-variant">
            Se abrirá una nueva atención para la mesa {{ selectedTable.number }}.
          </p>

          <input
            v-model="search"
            class="w-full rounded-lg bg-surface px-3 py-2 text-sm text-on-surface shadow-inner outline-none ring-1 ring-transparent placeholder:text-on-surface-variant/60 focus:ring-primary"
            placeholder="Buscar producto…"
            type="search"
          />

          <p v-if="products.length === 0" class="text-sm text-on-surface-variant">La sede no tiene un menú activo con productos.</p>

          <section v-for="group in productsByCategory" :key="group.category.id" class="space-y-2">
            <h3 class="font-label text-[11px] font-semibold tracking-widest text-on-surface-variant uppercase">
              {{ group.category.name }}
            </h3>
            <ul class="space-y-1.5">
              <li
                v-for="product in group.items"
                :key="product.id"
                class="flex items-center justify-between gap-3 rounded-xl bg-surface px-3 py-2"
              >
                <div class="min-w-0">
                  <p class="truncate text-sm font-semibold text-on-surface">{{ product.name }}</p>
                  <p class="text-xs text-on-surface-variant">{{ formatMoney(product.price, restaurant.currency) }}</p>
                </div>
                <span v-if="!product.isAvailable" class="font-label text-[11px] font-semibold text-on-surface-variant uppercase">
                  Agotado
                </span>
                <div v-else class="flex items-center gap-2 rounded-full bg-surface-container px-1 py-1">
                  <button
                    type="button"
                    class="flex h-7 w-7 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-high disabled:opacity-40"
                    :disabled="quantityOf(product.id) === 0"
                    :aria-label="`Quitar ${product.name}`"
                    @click="changeQuantity(product, -1)"
                  >
                    −
                  </button>
                  <span class="w-4 text-center text-sm font-bold">{{ quantityOf(product.id) }}</span>
                  <button
                    type="button"
                    class="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-on-primary hover:bg-primary-container"
                    :aria-label="`Agregar ${product.name}`"
                    @click="changeQuantity(product, 1)"
                  >
                    +
                  </button>
                </div>
              </li>
            </ul>
          </section>

          <section v-if="lines.length > 0" class="space-y-2 rounded-xl bg-surface-container-low p-3">
            <h3 class="font-label text-[11px] font-semibold tracking-widest text-on-surface-variant uppercase">Resumen</h3>
            <div v-for="line in lines" :key="line.product.id" class="space-y-1">
              <div class="flex items-center justify-between text-sm">
                <span>{{ line.quantity }}× {{ line.product.name }}</span>
                <span class="font-semibold">{{ formatMoney(line.product.price * line.quantity, restaurant.currency) }}</span>
              </div>
              <input
                v-model="line.notes"
                class="w-full rounded-lg bg-surface-container-lowest px-3 py-1.5 text-xs text-on-surface shadow-inner outline-none ring-1 ring-transparent placeholder:text-on-surface-variant/60 focus:ring-primary"
                placeholder="Observación (ej: sin cebolla)"
                type="text"
              />
            </div>
          </section>
        </template>

        <p v-if="formError" class="rounded-lg bg-error-container px-3 py-2 text-xs text-on-error-container" role="alert">
          {{ formError }}
        </p>
      </div>

      <footer class="flex items-center gap-3 border-t border-outline-variant/50 px-5 py-3 sm:px-6">
        <span class="font-headline text-lg font-semibold">{{ formatMoney(total, restaurant.currency) }}</span>
        <button
          type="button"
          class="font-label ml-auto rounded-xl bg-surface-container px-4 py-2.5 text-xs font-semibold text-on-surface hover:bg-surface-container-high"
          @click="closeDialog"
        >
          Cancelar
        </button>
        <button
          type="button"
          class="font-label rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-on-primary hover:bg-primary-container disabled:opacity-50"
          :disabled="isSubmitting || !tableNumber || lines.length === 0"
          @click="submit"
        >
          {{ isSubmitting ? 'Enviando…' : 'Enviar pedido' }}
        </button>
      </footer>
    </div>
  </dialog>
</template>
